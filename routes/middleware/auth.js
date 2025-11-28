export function getRoleFromRequest(req) {
  const headerRaw = req.headers["x-role"] || req.headers["role"] || "";
  if (headerRaw && headerRaw.toString().trim() !== "") {
    return headerRaw.toString().trim().toLowerCase();
  }
  const cookieRole = (req.cookies && req.cookies.role) || "";
  return (cookieRole || "").toString().trim().toLowerCase();
}

export function getBebanFromRequest(req) {
  const headerRaw = req.headers["x-beban"] || req.headers["beban"] || "";
  if (headerRaw && headerRaw.toString().trim() !== "") {
    return headerRaw.toString().trim();
  }
  const cookieBeban = (req.cookies && req.cookies.beban) || "";
  return (cookieBeban || "").toString().trim();
}

export function requireAdmin(req, res, next) {
  const role = getRoleFromRequest(req);
  if (role === "admin") return next();
  return res.status(403).json({ message: "Akses ditolak: hanya admin" });
}

export function requireUserOrAdmin(req, res, next) {
  const role = getRoleFromRequest(req);
  if (role === "admin" || role === "user") return next();
  return res
    .status(403)
    .json({ message: "Akses ditolak: login sebagai user atau admin" });
}
