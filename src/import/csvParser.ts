/**
 * Robust RFC-4180 Compliant CSV Parser
 *
 * Handles:
 * - Stripping UTF-8 BOM
 * - Quoted fields with embedded commas, semicolons, and newlines
 * - Escaped double quotes ("")
 * - Dynamic delimiter detection (, ; \t)
 * - Trailing blank lines
 */

export interface ParsedCsvTable {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses raw CSV string into an array of string arrays (grid of cells).
 */
export function parseCsvToGrid(rawText: string, customDelimiter?: string): string[][] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Strip BOM if present
  let text = rawText.replace(/^\uFEFF/, '');

  // Detect delimiter if not specified: check first line for comma vs semicolon vs tab
  let delimiter = customDelimiter;
  if (!delimiter) {
    const firstLineEnd = text.indexOf('\n');
    const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;

    if (semicolons > commas && semicolons > tabs) {
      delimiter = ';';
    } else if (tabs > commas && tabs > semicolons) {
      delimiter = '\t';
    } else {
      delimiter = ',';
    }
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++; // Skip \r in \r\n
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || inQuotes || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out empty trailing rows
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));
}

/**
 * Parses raw CSV into headers and an array of objects keyed by header name.
 */
export function parseCsvToTable(rawText: string, customDelimiter?: string): ParsedCsvTable {
  const grid = parseCsvToGrid(rawText, customDelimiter);
  if (grid.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = grid[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const headerName = rawHeaders[c];
      rowObj[headerName] = (row[c] !== undefined ? row[c] : '').trim();
    }
    // Only add row if at least one cell has content
    if (Object.values(rowObj).some((val) => val.length > 0)) {
      rows.push(rowObj);
    }
  }

  return { headers: rawHeaders, rows };
}
