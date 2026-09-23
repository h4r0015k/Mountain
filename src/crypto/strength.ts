/**
 * Mountain Password Strength Evaluator
 * Computes heuristic entropy and visual score without external dependencies.
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0: Very Weak, 1: Weak, 2: Fair, 3: Good, 4: Strong
  label: string;
  color: string;
  percent: number;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return { score: 0, label: 'Empty', color: 'bg-zinc-700', percent: 0 };
  }

  let points = 0;

  // Length scoring
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;

  // Character variety scoring
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (varietyCount >= 3) points += 1;
  if (varietyCount === 4 && password.length >= 10) points += 1;

  // Penalize repeated characters or simple sequences
  if (/(.)\1{2,}/.test(password)) points = Math.max(0, points - 1);
  if (/^(1234|admin|password|qwerty)/i.test(password)) points = Math.min(1, points);

  if (points <= 1) {
    return { score: 1, label: 'Weak', color: 'bg-rose-500', percent: 25 };
  }
  if (points === 2) {
    return { score: 2, label: 'Fair', color: 'bg-amber-500', percent: 50 };
  }
  if (points === 3 || points === 4) {
    return { score: 3, label: 'Good', color: 'bg-sky-400', percent: 75 };
  }
  return { score: 4, label: 'Strong', color: 'bg-emerald-400', percent: 100 };
}
