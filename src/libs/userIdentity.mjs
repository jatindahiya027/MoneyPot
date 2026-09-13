export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function maskEmail(value) {
  const email = normalizeEmail(value);
  const separator = email.lastIndexOf("@");
  if (separator < 1) return "Account email hidden";
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, Math.min(8, local.length - visible.length)))}@${domain}`;
}

export function isAllowedProfileImage(value) {
  const image = String(value || "");
  return image === "/profile.png"
    || /^\/uploads\/[^/\\]{1,220}\.(?:jpg|png|gif|webp)$/i.test(image);
}
