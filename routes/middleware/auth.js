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

// Convert different beban representations to an array of strings.
export function toBebanArray(beban) {
  if (!beban) return [];
  if (Array.isArray(beban))
    return beban.map((b) => (b || "").toString().trim()).filter(Boolean);
  if (typeof beban === "string") {
    const s = beban.trim();
    if (s === "") return [];
    // If it's a JSON array string, parse it
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr))
          return arr.map((b) => (b || "").toString().trim()).filter(Boolean);
      } catch (e) {
        // ignore parse errors
      }
    }
    // Comma-separated list?
    if (s.includes(",")) {
      return s
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }
    return [s];
  }
  return [];
}

// Return array of beban values taken from header or cookie instead of single value
export function getBebanListFromRequest(req) {
  const headerRaw = req.headers["x-beban"] || req.headers["beban"] || "";
  if (headerRaw && headerRaw.toString().trim() !== "") {
    return toBebanArray(headerRaw.toString().trim());
  }
  const cookieBeban = (req.cookies && req.cookies.beban) || "";
  return toBebanArray(cookieBeban || "");
}

// Build SQL filter clause and params for a field (e.g., 'Beban') and a list of beban values.
// Returns { clause, params }.
export function buildBebanFilterSQL(fieldName, bebanList) {
  if (!bebanList || bebanList.length === 0)
    return { clause: "1=1", params: [] };
  const exactSet = new Set();
  const prefixSet = new Set();
  bebanList.forEach((b) => {
    const s = (b || "").toString().trim();
    if (!s) return;
    exactSet.add(s);
    const idx = s.indexOf("-");
    if (idx !== -1) {
      prefixSet.add(s.substring(0, idx));
    }
  });
  const parts = [];
  const params = [];
  if (exactSet.size > 0) {
    const placeholders = Array.from(exactSet)
      .map(() => "?")
      .join(",");
    parts.push(`${fieldName} IN (${placeholders})`);
    Array.from(exactSet).forEach((v) => params.push(v));
  }
  if (prefixSet.size > 0) {
    prefixSet.forEach((p) => {
      parts.push(`${fieldName} LIKE ?`);
      params.push(`${p}-%`);
    });
  }
  const clause = parts.length > 0 ? `(${parts.join(" OR ")})` : "1=1";
  return { clause, params };
}

// Return the prefix for a Beban string. If there's a dash (e.g., "BNT-NET")
// returns part before dash ("BNT"). If not, returns original string unchanged.
export function getBebanPrefix(beban) {
  if (!beban || typeof beban !== "string") return beban;
  const idx = beban.indexOf("-");
  if (idx === -1) return beban;
  return beban.substring(0, idx);
}

// Returns true if two Beban values are considered the same location.
// This is true when they are identical OR they share the same prefix before '-'.
export function isSameLocation(beban1, beban2) {
  // Support beban1 or beban2 being arrays
  const arr1 = Array.isArray(beban1) ? beban1 : toBebanArray(beban1);
  const arr2 = Array.isArray(beban2) ? beban2 : toBebanArray(beban2);
  if (!arr1 || arr1.length === 0) return false;
  if (!arr2 || arr2.length === 0) return false;
  for (const a of arr1) {
    for (const b of arr2) {
      if (!a || !b) continue;
      if (a === b) return true;
      const p1 = getBebanPrefix(a);
      const p2 = getBebanPrefix(b);
      if (p1 && p2 && p1 === p2) return true;
    }
  }
  return false;
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
