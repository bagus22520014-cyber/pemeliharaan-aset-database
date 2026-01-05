import rateLimit from "express-rate-limit";

function isIntegerString(v) {
  if (v === undefined || v === null) return false;
  return /^\d+$/.test(String(v));
}

export function rateLimiter(opts = {}) {
  const windowMs =
    opts.windowMs || Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // default 1 minute
  const max = opts.max || Number(process.env.RATE_LIMIT_MAX) || 120;
  const rl = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      (req.headers["x-username"] || req.ip || "anon").toString(),
    handler: (req, res) =>
      res.status(429).json({ message: "Too many requests" }),
  });
  return rl;
}

export function sanitizeBody(req, res, next) {
  if (!req.body || typeof req.body !== "object") return next();
  for (const k of Object.keys(req.body)) {
    const v = req.body[k];
    if (typeof v === "string") {
      // trim and limit length
      req.body[k] = v.trim().slice(0, 2000);
    }
  }
  return next();
}

export function validateRuleInput(req, res, next) {
  const data = req.body || {};
  const allowedUnits = ["day", "week", "month", "year"];
  if (!isIntegerString(data.asset_id))
    return res.status(400).json({ message: "asset_id must be integer" });
  if (!data.title || typeof data.title !== "string")
    return res.status(400).json({ message: "title required" });
  if (!isIntegerString(data.interval_value) || Number(data.interval_value) <= 0)
    return res
      .status(400)
      .json({ message: "interval_value must be positive integer" });
  if (!data.interval_unit || !allowedUnits.includes(data.interval_unit))
    return res.status(400).json({ message: "interval_unit invalid" });
  if (!data.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date))
    return res.status(400).json({ message: "start_date must be YYYY-MM-DD" });
  if (data.anchor_type && !["fixed", "sliding"].includes(data.anchor_type))
    return res.status(400).json({ message: "anchor_type invalid" });
  return next();
}

export function validateRuleUpdate(req, res, next) {
  const data = req.body || {};
  const allowed = [
    "title",
    "description",
    "interval_value",
    "interval_unit",
    "start_date",
    "anchor_type",
    "enabled",
  ];
  const keys = Object.keys(data);
  if (keys.length === 0)
    return res.status(400).json({ message: "No fields to update" });
  for (const k of keys) {
    if (!allowed.includes(k))
      return res.status(400).json({ message: `Invalid field: ${k}` });
  }
  if (
    data.interval_value &&
    (!isIntegerString(data.interval_value) || Number(data.interval_value) <= 0)
  )
    return res
      .status(400)
      .json({ message: "interval_value must be positive integer" });
  if (
    data.interval_unit &&
    !["day", "week", "month", "year"].includes(data.interval_unit)
  )
    return res.status(400).json({ message: "interval_unit invalid" });
  if (data.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date))
    return res.status(400).json({ message: "start_date must be YYYY-MM-DD" });
  return next();
}

export function validateScheduleQuery(req, res, next) {
  const q = req.query || {};
  if (q.asset_id && !isIntegerString(q.asset_id))
    return res.status(400).json({ message: "asset_id must be integer" });
  if (q.rule_id && !isIntegerString(q.rule_id))
    return res.status(400).json({ message: "rule_id must be integer" });
  if (q.status && !["pending", "claimed", "completed"].includes(q.status))
    return res.status(400).json({ message: "status invalid" });
  if (q.due_before && !/^\d{4}-\d{2}-\d{2}$/.test(q.due_before))
    return res.status(400).json({ message: "due_before must be YYYY-MM-DD" });
  if (q.due_after && !/^\d{4}-\d{2}-\d{2}$/.test(q.due_after))
    return res.status(400).json({ message: "due_after must be YYYY-MM-DD" });
  if (
    q.limit &&
    (!isIntegerString(q.limit) || Number(q.limit) < 1 || Number(q.limit) > 1000)
  )
    return res.status(400).json({ message: "limit invalid" });
  if (q.offset && (!isIntegerString(q.offset) || Number(q.offset) < 0))
    return res.status(400).json({ message: "offset invalid" });
  return next();
}

export function validateIdParam(req, res, next) {
  const { id } = req.params;
  if (!isIntegerString(id))
    return res.status(400).json({ message: "id must be integer" });
  return next();
}

export function validateScheduleUpdate(req, res, next) {
  const data = req.body || {};
  const allowed = [
    "status",
    "claimed_by",
    "claimed_at",
    "completed_at",
    "due_date",
  ];
  const keys = Object.keys(data);
  if (keys.length === 0)
    return res.status(400).json({ message: "No fields to update" });
  for (const k of keys)
    if (!allowed.includes(k))
      return res.status(400).json({ message: `Invalid field: ${k}` });
  if (data.status && !["pending", "claimed", "completed"].includes(data.status))
    return res.status(400).json({ message: "status invalid" });
  if (data.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date))
    return res.status(400).json({ message: "due_date must be YYYY-MM-DD" });
  return next();
}

export function validateCompleteBody(req, res, next) {
  const data = req.body || {};
  if (
    data.performed_at &&
    !/^\d{4}-\d{2}-\d{2}/.test(String(data.performed_at))
  )
    return res.status(400).json({ message: "performed_at must be date-like" });
  if (data.cost && isNaN(Number(data.cost)))
    return res.status(400).json({ message: "cost must be numeric" });
  return next();
}
