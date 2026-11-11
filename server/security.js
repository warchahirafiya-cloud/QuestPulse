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
