const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(delete|erase|wipe|factory reset|format)\b/i, reason: 'destructive changes' },
  { pattern: /\b(transfer|wire|pay|purchase|buy|send money)\b/i, reason: 'financial actions' },
  { pattern: /\b(unlock|open the door|disarm|disable alarm|turn off alarm)\b/i, reason: 'physical access or safety controls' },
  { pattern: /\b(run|execute|install|sudo|rm -rf|powershell|terminal|shell command)\b/i, reason: 'device or shell commands' },
  { pattern: /\b(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|ssh|scp|curl|wget|nmap|router|home assistant)\b/i, reason: 'local network or planned future integrations' },
];

const CONFIRM_PATTERNS = /^(confirm|yes|y|proceed|do it|send it|continue)$/i;
const CANCEL_PATTERNS = /^(cancel|no|stop|never mind|abort)$/i;

export function assessRiskyAction(text: string): { risky: boolean; reason?: string } {
  for (const candidate of HIGH_RISK_PATTERNS) {
    if (candidate.pattern.test(text)) {
      return { risky: true, reason: candidate.reason };
    }
  }

  return { risky: false };
}

export function isConfirmationMessage(text: string): boolean {
  return CONFIRM_PATTERNS.test(text.trim());
}

export function isCancellationMessage(text: string): boolean {
  return CANCEL_PATTERNS.test(text.trim());
}
