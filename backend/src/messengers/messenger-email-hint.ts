export function messengerEmailHint(email: string): string | null {
  const parts = email.trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const local = Array.from(parts[0]);
  // Keep at least one local-part character hidden, including very short emails.
  const visible = local.slice(0, Math.min(2, local.length - 1)).join('');
  return `${visible}***@${parts[1]}`;
}
