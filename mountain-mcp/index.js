#!/usr/bin/env node
/**
 * mountain-mcp — MCP Bridge Server for Mountain Password Manager
 *
 * Architecture:
 *   - Binds a single HTTP server on 127.0.0.1:27182
 *   - GET  /sse      → MCP SSE stream for AI agents (Claude Desktop, Cursor, etc.)
 *   - POST /messages → MCP JSON-RPC messages from AI agents
 *   - GET  /health   → Quick health check
 *   - WS   /spa      → WebSocket connection from Mountain SPA (browser tab)
 *
 * Security:
 *   - Bound to 127.0.0.1 only (never 0.0.0.0)
 *   - Master key NEVER leaves the Mountain SPA tab
 *   - Bridge only forwards credential requests and relays responses
 *   - Only returns individual credentials on demand (minimum disclosure)
 *   - All SSE clients are disconnected if the vault locks
 */

import http from 'http';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';

const PORT = 27182;
const HOST = 'localhost';
const SERVER_NAME = 'mountain-mcp';
const SERVER_VERSION = '1.2.0';
const MCP_PROTOCOL_VERSION = '2024-11-05';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Mountain MCP Bridge v${SERVER_VERSION}

Usage:
  npm run mcp
  node mountain-mcp/index.js

Configuration:
  1. Start this bridge
  2. Open Mountain -> Settings -> Companion -> Click Connect
  3. Add to claude_desktop_config.json:
     {
       "mcpServers": {
         "mountain": {
           "url": "http://127.0.0.1:27182/sse?token=mntn_your_token"
         }
       }
     }
`);
  process.exit(0);
}

// ─── State ───────────────────────────────────────────────────────────────────

/** Active Mountain SPA WebSocket connection */
let spaSocket = null;

/** Active authorized Bearer token provided by Mountain SPA */
let activeMcpToken = null;

/** Pending requests waiting for SPA response: requestId → { resolve, timer } */
const pendingRequests = new Map();

/** Active MCP SSE sessions: sessionId → { res, write } */
const sseSessions = new Map();

let requestCounter = 0;

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

function extractBearerToken(req, url) {
  const auth = req.headers['authorization'] || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return url.searchParams.get('token') || '';
}

function isAuthorized(req, url) {
  // If Mountain SPA has not registered an active token, deny all requests
  if (!activeMcpToken) return false;

  const clientToken = extractBearerToken(req, url);
  if (!clientToken || clientToken.length !== activeMcpToken.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(activeMcpToken));
  } catch {
    return false;
  }
}

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const origin = req.headers['origin'];
  const isAllowedOrigin =
    !origin ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:') ||
    origin.startsWith('https://127.0.0.1:') ||
    origin === 'http://localhost' ||
    origin === 'http://127.0.0.1';

  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(isAllowedOrigin ? 204 : 403);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}`);
  const path = url.pathname;

  // ── GET /health ────────────────────────────────────────────────────────────
  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      server: SERVER_NAME,
      version: SERVER_VERSION,
      spaConnected: spaSocket !== null && spaSocket.readyState === 1,
      authenticated: activeMcpToken !== null,
      activeSessions: sseSessions.size,
    }));
    return;
  }

  // ── GET /sse ───────────────────────────────────────────────────────────────
  if (req.method === 'GET' && path === '/sse') {
    if (!isAuthorized(req, url)) {
      // Do NOT send WWW-Authenticate: Bearer header.
      // Sending WWW-Authenticate causes the Anthropic MCP SDK to attempt OAuth 2.0 Dynamic Client Registration (DCR).
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing Bearer token. Configure "Authorization: Bearer <token>" or "?token=<token>" in your MCP client.',
      }));
      return;
    }
    handleSseConnection(req, res, url);
    return;
  }

  // ── POST /messages ─────────────────────────────────────────────────────────
  if (req.method === 'POST' && path === '/messages') {
    const sessionId = url.searchParams.get('sessionId') || '';
    const session = sseSessions.get(sessionId);

    // Allow if session was authenticated during SSE handshake, or if request carries valid token
    if (!session && !isAuthorized(req, url)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Unauthorized MCP session',
      }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      res.writeHead(202);
      res.end();
      handleMcpMessage(sessionId, body);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ─── WebSocket Server (for Mountain SPA) ─────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/spa' });

wss.on('connection', (ws, req) => {
  // Only accept connections from loopback addresses
  const remoteAddr = req.socket.remoteAddress || '';
  const isLoopback =
    remoteAddr === '127.0.0.1' ||
    remoteAddr === '::1' ||
    remoteAddr === '::ffff:127.0.0.1' ||
    remoteAddr === 'localhost' ||
    remoteAddr === '';
  if (!isLoopback) {
    ws.close(1008, 'Only localhost connections accepted');
    return;
  }

  console.log('[MCP] Mountain SPA connected');

  // Extract auth token from connection URL
  try {
    const reqUrl = new URL(req.url, `http://${HOST}`);
    const queryToken = reqUrl.searchParams.get('token');
    if (queryToken) {
      activeMcpToken = queryToken;
      console.log('[MCP] Active bearer token registered via SPA connection');
    }
  } catch {}

  // Close any previous SPA connection before replacing it
  if (spaSocket && spaSocket.readyState === 1) {
    spaSocket.close(1001, 'Replaced by new connection');
  }
  spaSocket = ws;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // SPA can register or rotate token dynamically
      if (msg.action === 'SET_TOKEN' && msg.token) {
        activeMcpToken = msg.token;
        console.log('[MCP] Active bearer token updated by Mountain SPA');
        return;
      }

      const pending = pendingRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(msg.requestId);
        pending.resolve(msg);
      }
    } catch {}
  });

  ws.on('close', () => {
    console.log('[MCP] Mountain SPA disconnected');
    spaSocket = null;
    activeMcpToken = null; // Revoke token immediately when SPA disconnects
    // Fail all pending requests
    for (const [, pending] of pendingRequests) {
      clearTimeout(pending.timer);
      pending.resolve({ error: 'SPA_DISCONNECTED', unlocked: false });
    }
    pendingRequests.clear();
    // Notify all SSE clients
    for (const [, session] of sseSessions) {
      session.write(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/message', params: { level: 'warning', data: 'Mountain vault disconnected' } })}\n\n`);
    }
  });

  ws.on('error', () => {});
});

wss.on('error', () => {});

// ─── SSE Connection ───────────────────────────────────────────────────────────

function handleSseConnection(req, res, url) {
  const sessionId = generateId();
  const token = extractBearerToken(req, url);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const write = (text) => { if (!res.destroyed) res.write(text); };

  sseSessions.set(sessionId, { res, write, authenticated: true });

  req.on('close', () => {
    sseSessions.delete(sessionId);
  });

  // MCP SSE handshake: tell client where to POST messages (include token so clients using query params stay authenticated)
  const endpoint = token
    ? `/messages?sessionId=${sessionId}&token=${encodeURIComponent(token)}`
    : `/messages?sessionId=${sessionId}`;
  write(`event: endpoint\ndata: ${endpoint}\n\n`);
}

// ─── MCP Message Processing ───────────────────────────────────────────────────

async function handleMcpMessage(sessionId, body) {
  const session = sseSessions.get(sessionId);
  if (!session) return;

  let msg;
  try {
    msg = JSON.parse(body);
  } catch {
    return;
  }

  const { method, id, params } = msg;
  const send = (payload) => session.write(`data: ${JSON.stringify(payload)}\n\n`);

  switch (method) {
    case 'initialize':
      send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        },
      });
      break;

    case 'notifications/initialized':
      break;

    case 'ping':
      send({ jsonrpc: '2.0', id, result: {} });
      break;

    case 'tools/list':
      send({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
      break;

    case 'tools/call':
      await handleToolCall(send, id, params);
      break;

    default:
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } });
  }
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const MCP_TOOLS = [
  {
    name: 'vault_status',
    description: 'Check whether the Mountain vault is currently unlocked and the bridge is active.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_domains',
    description: 'List all saved credential titles and domains in the Mountain vault. Returns only titles and domain names — never passwords or secrets.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_credential',
    description: 'Get the username and password for a specific domain from the Mountain vault. Only returns credentials for the exact domain requested.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'The domain or hostname to look up (e.g. "github.com", "stripe.com").',
        },
      },
      required: ['domain'],
    },
  },
];

// ─── Tool Call Handler ────────────────────────────────────────────────────────

async function handleToolCall(send, id, params) {
  const toolName = params?.name;
  const toolArgs = params?.arguments || {};

  try {
    switch (toolName) {
      case 'vault_status': {
        if (!spaSocket || spaSocket.readyState !== 1) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Mountain is not connected. Open Mountain in your browser and enable the MCP bridge in Settings → Companion.' }] } });
          break;
        }
        const resp = await querySpa({ action: 'CHECK_STATUS' });
        send({
          jsonrpc: '2.0', id,
          result: {
            content: [{
              type: 'text',
              text: resp?.unlocked
                ? `Mountain vault is unlocked. ${resp.itemCount ?? 0} credentials available.`
                : 'Mountain vault is locked. Please unlock it in the Mountain browser tab.',
            }],
          },
        });
        break;
      }

      case 'list_domains': {
        if (!spaSocket || spaSocket.readyState !== 1) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Mountain is not connected. Open Mountain in your browser and enable the MCP bridge in Settings → Companion.' }], isError: true } });
          break;
        }
        const resp = await querySpa({ action: 'GET_ALL_ITEMS' });
        if (resp?.error === 'VAULT_LOCKED' || !resp?.unlocked) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Vault is locked. Please unlock Mountain first.' }], isError: true } });
          break;
        }
        if (resp?.error) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Failed to list domains: ${resp.error}` }], isError: true } });
          break;
        }
        const items = (resp.items || []).map((i) => `• ${i.title}${i.domain ? ` (${i.domain})` : ''}`).join('\n');
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: items || 'No credentials saved yet.' }] } });
        break;
      }

      case 'get_credential': {
        const domain = (toolArgs.domain || '').trim();
        if (!domain) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Missing required argument: domain' }], isError: true } });
          break;
        }
        if (!spaSocket || spaSocket.readyState !== 1) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Mountain is not connected. Open Mountain in your browser and enable the MCP bridge in Settings → Companion.' }], isError: true } });
          break;
        }
        const resp = await querySpa({ action: 'GET_CREDENTIAL', domain });
        if (resp?.error === 'VAULT_LOCKED' || !resp?.unlocked) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Vault is locked. Please unlock Mountain first.' }], isError: true } });
          break;
        }
        if (resp?.error) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Failed to retrieve credential: ${resp.error}` }], isError: true } });
          break;
        }
        if (!resp?.credential) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `No credential found for "${domain}".` }] } });
          break;
        }
        const { title, username, password, url } = resp.credential;
        send({
          jsonrpc: '2.0', id,
          result: {
            content: [{
              type: 'text',
              text: [`**${title}**`, `Username: ${username}`, `Password: ${password}`, url ? `URL: ${url}` : ''].filter(Boolean).join('\n'),
            }],
          },
        });
        break;
      }

      default:
        send({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${toolName}` } });
    }
  } catch (err) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: `Tool failed: ${err?.message || String(err)}` } });
  }
}

// ─── SPA IPC ──────────────────────────────────────────────────────────────────

function querySpa(payload) {
  return new Promise((resolve) => {
    if (!spaSocket || spaSocket.readyState !== 1) {
      resolve({ unlocked: false, error: 'SPA_NOT_CONNECTED' });
      return;
    }

    const requestId = `mcp_${++requestCounter}_${generateId()}`;
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve({ unlocked: false, error: 'TIMEOUT' });
    }, 5000);

    pendingRequests.set(requestId, { resolve, timer });
    spaSocket.send(JSON.stringify({ ...payload, requestId, source: 'MOUNTAIN_MCP_BRIDGE' }));
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
  console.log(`\n🏔  Mountain MCP Bridge v${SERVER_VERSION}`);
  console.log(`   Listening on http://${HOST}:${PORT}\n`);
  console.log('   Waiting for Mountain SPA to connect...');
  console.log('   (Open Mountain in your browser and enable MCP in Settings → Companion)\n');
  console.log('   Add to claude_desktop_config.json:');
  console.log('   {');
  console.log('     "mcpServers": {');
  console.log('       "mountain": {');
  console.log(`         "url": "http://${HOST}:${PORT}/sse"`);
  console.log('       }');
  console.log('     }');
  console.log('   }\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Is mountain-mcp already running?\n`);
  } else {
    console.error('[MCP] Server error:', err.message);
  }
  process.exit(1);
});
