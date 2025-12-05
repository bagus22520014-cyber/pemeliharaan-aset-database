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
  return {
    id: r.id ?? null,
    user_id: r.user_id ?? null,
    username: r.username ?? null,
    beban: r.beban ?? null,
    tipe: r.tipe ?? null,
    judul: r.judul ?? null,
    pesan: r.pesan ?? null,
    link: r.link ?? null,
    tabel_ref: r.tabel_ref ?? null,
    record_id: r.record_id ?? null,
    dibaca: r.dibaca ?? false,
    waktu_dibuat: r.waktu_dibuat ?? null,
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
  const username = req.cookies.username || req.headers["x-username"];
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

      // Filter by dibaca status
      if (dibaca === "true") {
        q += ` AND n.dibaca = TRUE`;
      } else if (dibaca === "false") {
        q += ` AND n.dibaca = FALSE`;
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
  const username = req.cookies.username || req.headers["x-username"];
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
  const username = req.cookies.username || req.headers["x-username"];
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
  const username = req.cookies.username || req.headers["x-username"];
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
