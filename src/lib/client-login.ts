/**
 * Generates a client login from full name.
 * Rule: first letter of first name + full last name, lowercase, no Polish chars.
 * Example: "Daniel Rychlik" → "drychlik"
 *          "Zuzanna Kowalska-Nowak" → "zkowalska-nowak"
 */
export function generateClientLogin(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "";
  const firstInitial = removeDiacritics(parts[0])[0];
  const lastName = parts.slice(1).map(removeDiacritics).join("");
  return firstInitial + lastName;
}

function removeDiacritics(str: string): string {
  return str
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/[^a-z0-9-]/g, "");
}
