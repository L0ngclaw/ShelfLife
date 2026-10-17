// Turns an email into a short display name: "pubudu.w@gmail.com" -> "Pubudu.w"
export function displayName(email) {
  if (!email) return "Someone";
  const name = email.split("@")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
