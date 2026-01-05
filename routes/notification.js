import express from "express";
import db from "../db.js";
import {
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
} from "./middleware/auth.js";

const router = express.Router();

// Helper function to map notification row
function mapNotification(r) {
  if (!r) return r;

  // Parse message to extract title if formatted as [Title] Message
  let judul = null;
  let pesan = r.message || r.pesan || null;
  if (pesan && pesan.startsWith("[")) {
    const match = pesan.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (match) {
      judul = match[1];
      pesan = match[2];
    }
  }

  return {
    id: r.id ?? null,
    user_id: r.user_id ?? null,
    username: r.username ?? null,
    beban: r.beban ?? null,
    tipe: r.type ?? r.tipe ?? null,
    judul: judul || r.judul || null,
    pesan: pesan,
    link: r.link ?? null,
    tabel_ref: r.tabel_ref ?? null,
    record_id: r.record_id ?? null,
    AsetId: r.AsetId ?? null,
    approver_user_id: r.approver_user_id ?? null,
    approver_username: r.approver_username ?? null,
    approver_role: r.approver_role ?? null,
    dibaca: r.dibaca === 1 || r.dibaca === true ? true : false,
    waktu_dibuat: r.created_at ?? r.waktu_dibuat ?? null,
    waktu_dibaca: r.waktu_dibaca ?? null,
  };
}

// Logging
router.use((req, res, next) => {
  const role = getRoleFromRequest(req) || "(none)";
  console.log(`[notification] ${req.method} ${req.originalUrl} - role=${role}`);
  next();
});

// GET notifications for current user
router.get("/", requireUserOrAdmin, (req, res) => {
  const username =
    req.cookies.username ||
    req.headers["x-username"] ||
    (req.query && (req.query["x-username"] || req.query.username));
  if (!username) {
    return res.status(401).json({ message: "Username tidak ditemukan" });
  }

  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);

  // Get user_id
  db.query(
    "SELECT id FROM user WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const userId = rows[0].id;
      const limit = parseInt(req.query.limit) || 50;
      const dibaca = req.query.dibaca; // 'true', 'false', or undefined (all)

      let q = `
      SELECT n.*, u.username 
      FROM notification n 
      LEFT JOIN user u ON n.user_id = u.id
      WHERE (n.user_id = ? OR n.user_id IS NULL)
    `;
      const params = [userId];

      // Filter by beban if user role
      if (role !== "admin" && beban && beban.length > 0) {
        q += ` AND (n.beban IN (${beban
          .map(() => "?")
          .join(",")}) OR n.beban IS NULL)`;
        params.push(...beban);
      }

      // Filter by dibaca status (use dibaca column if exists, fallback handled in mapping)
      if (dibaca === "true") {
        q += ` AND (n.dibaca = TRUE OR n.dibaca = 1)`;
      } else if (dibaca === "false") {
        q += ` AND (n.dibaca = FALSE OR n.dibaca = 0 OR n.dibaca IS NULL)`;
      }

      q += ` ORDER BY n.waktu_dibuat DESC LIMIT ?`;
      params.push(limit);

      db.query(q, params, (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json({
          total: rows.length,
          notifications: rows.map(mapNotification),
        });
      });
    }
  );
});

// GET unread count
router.get("/unread-count", requireUserOrAdmin, (req, res) => {
  const username =
    req.cookies.username ||
    req.headers["x-username"] ||
    (req.query && (req.query["x-username"] || req.query.username));
  if (!username) {
    return res.status(401).json({ message: "Username tidak ditemukan" });
  }

  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);

  db.query(
    "SELECT id FROM user WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const userId = rows[0].id;

      let q = `
      SELECT COUNT(*) as count 
      FROM notification 
      WHERE dibaca = FALSE 
      AND (user_id = ? OR user_id IS NULL)
    `;
      const params = [userId];

      if (role !== "admin" && beban && beban.length > 0) {
        q += ` AND (beban IN (${beban
          .map(() => "?")
          .join(",")}) OR beban IS NULL)`;
        params.push(...beban);
      }

      db.query(q, params, (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json({ unread_count: rows[0].count });
      });
    }
  );
});

// Mark notification as read
router.put("/:id/read", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const username =
    req.cookies.username ||
    req.headers["x-username"] ||
    (req.query && (req.query["x-username"] || req.query.username));
  if (!username) {
    return res.status(401).json({ message: "Username tidak ditemukan" });
  }

  db.query(
    "SELECT id FROM user WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const userId = rows[0].id;

      const q = `
      UPDATE notification 
      SET dibaca = TRUE, waktu_dibaca = CURRENT_TIMESTAMP 
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `;

      db.query(q, [id, userId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Notifikasi tidak ditemukan" });
        }
        res.json({ message: "Notifikasi ditandai sudah dibaca" });
      });
    }
  );
});

// Mark all as read
router.put("/read-all", requireUserOrAdmin, (req, res) => {
  const username =
    req.cookies.username ||
    req.headers["x-username"] ||
    (req.query && (req.query["x-username"] || req.query.username));
  if (!username) {
    return res.status(401).json({ message: "Username tidak ditemukan" });
  }

  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);

  db.query(
    "SELECT id FROM user WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const userId = rows[0].id;

      let q = `
      UPDATE notification 
      SET dibaca = TRUE, waktu_dibaca = CURRENT_TIMESTAMP 
      WHERE dibaca = FALSE AND (user_id = ? OR user_id IS NULL)
    `;
      const params = [userId];

      if (role !== "admin" && beban && beban.length > 0) {
        q += ` AND (beban IN (${beban
          .map(() => "?")
          .join(",")}) OR beban IS NULL)`;
        params.push(...beban);
      }

      db.query(q, params, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({
          message: "Semua notifikasi ditandai sudah dibaca",
          affected: result.affectedRows,
        });
      });
    }
  );
});

// --- Maintenance notification_logs endpoints ---

// List notification_logs for current user
router.get("/logs", requireUserOrAdmin, async (req, res) => {
  const username =
    req.cookies.username ||
    req.headers["x-username"] ||
    (req.query && (req.query["x-username"] || req.query.username));
  if (!username)
    return res.status(401).json({ message: "Username tidak ditemukan" });
  const [urows] = await db
    .promise()
    .query("SELECT id FROM user WHERE username = ?", [username]);
  if (!urows || urows.length === 0)
    return res.status(404).json({ message: "User tidak ditemukan" });
  const userId = urows[0].id;
  const limit = parseInt(req.query.limit || "50", 10);
  const since = req.query.since; // ISO date
  const params = [userId];
  let q = `SELECT nl.* FROM notification_logs nl WHERE nl.user_id = ?`;
  if (since) {
    q += ` AND nl.send_date > ?`;
    params.push(since);
  }
  q += ` ORDER BY nl.send_date DESC LIMIT ?`;
  params.push(limit);
  const [rows] = await db.promise().query(q, params);
  res.json({ total: rows.length, notifications: rows });
});

// Admin: combined feed of `notification` and `notification_logs`
router.get("/combined", requireUserOrAdmin, async (req, res) => {
  try {
    const role = getRoleFromRequest(req);
    if (role !== "admin")
      return res.status(403).json({ message: "Forbidden: admin only" });
    const limit = parseInt(req.query.limit || "50", 10);

    // Resolve requesting user id from username header/cookie
    const username = req.cookies.username || req.headers["x-username"];
    let requesterId = null;
    if (username) {
      const [urows] = await db
        .promise()
        .query("SELECT id FROM user WHERE username = ? LIMIT 1", [username]);
      if (urows && urows.length > 0) requesterId = urows[0].id;
    }

    // Only include notifications that are global (user_id IS NULL) or targeted to requester
    let notifsQuery =
      "SELECT n.*, u.username FROM notification n LEFT JOIN user u ON n.user_id = u.id";
    const notifsParams = [];
    if (requesterId) {
      notifsQuery += " WHERE (n.user_id = ? OR n.user_id IS NULL)";
      notifsParams.push(requesterId);
    }
    notifsQuery += " ORDER BY n.created_at DESC LIMIT ?";
    notifsParams.push(limit);
    const [notifs] = await db.promise().query(notifsQuery, notifsParams);

    // For admin, include notification_logs that are either global (user_id IS NULL)
    // or explicitly targeted to the requesting admin (user_id = requesterId).
    let logsQuery = "SELECT nl.* FROM notification_logs nl";
    const logsParams = [];
    if (requesterId) {
      logsQuery += " WHERE (nl.user_id = ? OR nl.user_id IS NULL)";
      logsParams.push(requesterId);
    }
    logsQuery += " ORDER BY nl.send_date DESC LIMIT ?";
    logsParams.push(limit);

    const [logs] = await db.promise().query(logsQuery, logsParams);

    res.json({
      total_notifications: notifs.length,
      total_logs: logs.length,
      notifications: notifs,
      notification_logs: logs,
    });
  } catch (e) {
    res.status(500).json({ message: e.message || String(e) });
  }
});

// Mark a notification_log as read
router.post("/logs/:id/read", requireUserOrAdmin, async (req, res) => {
  const id = req.params.id;
  const username = req.cookies.username || req.headers["x-username"];
  if (!username)
    return res.status(401).json({ message: "Username tidak ditemukan" });
  const [urows] = await db
    .promise()
    .query("SELECT id FROM user WHERE username = ?", [username]);
  if (!urows || urows.length === 0)
    return res.status(404).json({ message: "User tidak ditemukan" });
  const userId = urows[0].id;
  const [r] = await db
    .promise()
    .execute(
      "UPDATE notification_logs SET read_at = NOW() WHERE id = ? AND user_id = ?",
      [id, userId]
    );
  if (r.affectedRows === 0)
    return res.status(404).json({ message: "Not found or not yours" });
  res.json({ message: "Marked read" });
});

// SSE stream for user's notification_logs (simple polling implementation)
router.get("/stream", requireUserOrAdmin, async (req, res) => {
  const username = req.cookies.username || req.headers["x-username"];
  if (!username) return res.status(401).end();
  const [urows] = await db
    .promise()
    .query("SELECT id FROM user WHERE username = ?", [username]);
  if (!urows || urows.length === 0) return res.status(404).end();
  const userId = urows[0].id;

  // Ensure CORS headers are present for EventSource responses. Some clients
  // connect from a different origin (vite dev server), and the global CORS
  // middleware headers may be overwritten by writeHead below. Set required
  // CORS headers explicitly first, then write the SSE headers.
  try {
    const origin = req.headers.origin || process.env.FRONTEND_ORIGIN || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  } catch (e) {}

  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  res.write(`retry: 5000\n\n`);

  let lastSeen = req.query.since || new Date(0).toISOString();

  const sendNew = async () => {
    try {
      const [rows] = await db
        .promise()
        .query(
          "SELECT * FROM notification_logs WHERE user_id = ? AND send_date > ? ORDER BY send_date ASC",
          [userId, lastSeen]
        );
      for (const r of rows) {
        lastSeen = r.send_date;
        res.write(`event: notification\ndata: ${JSON.stringify(r)}\n\n`);
      }
    } catch (e) {
      // ignore
    }
  };

  // initial send
  await sendNew();

  const iv = setInterval(sendNew, 5000);
  req.on("close", () => {
    clearInterval(iv);
  });
});

// Delete notification (user can delete their own, admin can delete any)
router.delete("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const username = req.cookies.username || req.headers["x-username"];
  const role = getRoleFromRequest(req);

  if (!username) {
    return res.status(401).json({ message: "Username tidak ditemukan" });
  }

  db.query(
    "SELECT id FROM user WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const userId = rows[0].id;

      let q = "DELETE FROM notification WHERE id = ?";
      const params = [id];

      // Regular users can only delete their own notifications
      if (role !== "admin") {
        q += " AND user_id = ?";
        params.push(userId);
      }

      db.query(q, params, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Notifikasi tidak ditemukan" });
        }
        res.json({ message: "Notifikasi berhasil dihapus" });
      });
    }
  );
});

export default router;
