export function originGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const expected = process.env.APP_ORIGIN;
  const origin = req.get("origin");
  if (!expected || !origin || origin !== expected) {
    return res.status(403).json({ error: "Request origin rejected." });
  }
  next();
}
export function safeUser(user) {
  return { id: user.id, displayName: user.display_name, accountType: user.account_type, email: user.email, role: user.role, status: user.status };
}

export function readCookie(header, name) {
  for (const part of (header || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}
