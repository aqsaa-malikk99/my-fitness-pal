/** Comma-separated emails in VITE_ADMIN_EMAILS — trim, case-insensitive match. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  if (!raw || !raw.trim()) return false;
  const norm = email.trim().toLowerCase();
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(norm);
}
