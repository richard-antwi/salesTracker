/**
 * Validates Ghana mobile phone numbers.
 * Must be exactly 10 digits and start with '0' (e.g. 0244123456).
 */
export function isValidGhanaPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.trim();
  return /^0\d{9}$/.test(cleaned);
}
