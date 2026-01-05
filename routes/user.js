import express from "express";
import db from "../db.js";
import { requireAdmin, toBebanArray } from "./middleware/auth.js";

const router = express.Router();

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  const q = "SELECT * FROM user WHERE username = ? AND password = ?";
  db.query(q, [username, password], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: "Login gagal" });
    }

    const user = result[0];
    console.log(
      `login success: ${user.username ?? user.Username} (role=${user.role})`
    );
    const role = (user.role ?? "").toString().trim().toLowerCase();
    const bebanRaw = user.Beban ?? user.beban ?? null;
    const bebanArr = toBebanArray(bebanRaw);
    const username = user.username ?? user.Username;

    res.cookie("role", role, { sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 });
    res.cookie("username", username, {
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    if (bebanArr && bebanArr.length > 0) {
      res.cookie("beban", JSON.stringify(bebanArr), {
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    res.json({
      message: "Login berhasil",
      role,
      beban: bebanArr.length > 0 ? bebanArr : null,
      nama: user.nama ?? user.Nama ?? null,
      // kekurangan removed - use Keterangan in user profile if needed
      username: user.username ?? user.Username ?? null,
      id: user.id ?? user.Id ?? null,
    });
  });
};

router.post("/login", loginHandler);
router.post("/", loginHandler);

router.get("/", requireAdmin, (req, res) => {
  const q = "SELECT username, nama, role, Beban FROM user";
  db.query(q, (err, result) => {
    if (err) return res.status(500).json(err);
    // Parse Beban JSON if possible
    const mapped = result.map((r) => {
      let bebanVal = r.Beban ?? r.beban ?? null;
      try {
        if (typeof bebanVal === "string" && bebanVal.trim() !== "") {
          // If stored as JSON array string (e.g. '["A","B"]') -> parse
          if (bebanVal.trim().startsWith("[")) {
            bebanVal = JSON.parse(bebanVal);
          } else if (bebanVal.includes(",")) {
            // CSV stored in cookie or old format
            bebanVal = bebanVal.split(",").map((x) => x.trim());
          } else {
            bebanVal = [bebanVal];
          }
        }
      } catch (e) {
        // fallback: keep original
      }
      return {
        username: r.username ?? r.Username,
        nama: r.nama ?? r.Nama ?? null,
        role: r.role ?? r.Role,
        beban: bebanVal,
      };
    });
    res.json(mapped);
  });
});

// Admin-only: Return full user rows, parsed Beban included
router.get("/all", requireAdmin, (req, res) => {
  const q = "SELECT * FROM user";
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json(err);
    const mapped = rows.map((r) => {
      let bebanVal = r.Beban ?? r.beban ?? null;
      try {
        if (typeof bebanVal === "string" && bebanVal.trim() !== "") {
          if (bebanVal.trim().startsWith("[")) {
            bebanVal = JSON.parse(bebanVal);
          } else if (bebanVal.includes(",")) {
            bebanVal = bebanVal.split(",").map((x) => x.trim());
          } else {
            bebanVal = [bebanVal];
          }
        }
      } catch (e) {}
      return { ...r, nama: r.nama ?? r.Nama ?? null, beban: bebanVal };
    });
    res.json(mapped);
  });
});

// Admin-only: Create new user
router.post("/create", requireAdmin, (req, res) => {
  const { username, password, nama, beban, role } = req.body;

  // Debug logging for incoming create requests
  try {
    console.log("[user.create] incoming request headers:", {
      x_role: req.headers["x-role"] || req.headers["role"],
      x_username: req.headers["x-username"] || null,
    });
    console.log("[user.create] body:", req.body);
  } catch (e) {
    /* ignore logging errors */
  }

  // Validate required fields
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "username dan password diperlukan" });
  }

  // Default role to 'user' if not provided
  const userRole = role || "user";

  // Convert beban to JSON array
  let bebanArray = [];
  if (beban) {
    if (Array.isArray(beban)) {
      bebanArray = beban;
    } else if (typeof beban === "string") {
      if (beban.trim().startsWith("[")) {
        try {
          bebanArray = JSON.parse(beban);
        } catch (e) {
          bebanArray = [beban];
        }
      } else if (beban.includes(",")) {
        bebanArray = beban.split(",").map((x) => x.trim());
      } else {
        bebanArray = [beban];
      }
    }
  }

  const bebanJson = bebanArray.length > 0 ? JSON.stringify(bebanArray) : null;
  const userName = nama || username;

  const q =
    "INSERT INTO user (username, password, nama, role, Beban) VALUES (?, ?, ?, ?, ?)";
  db.query(
    q,
    [username, password, userName, userRole, bebanJson],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Username sudah ada" });
        }
        return res.status(500).json(err);
      }

      const userId = result.insertId;

      // sync beban_users mapping for maintenance notifications
      if (!bebanArray || bebanArray.length === 0) {
        return res.status(201).json({
          message: "User berhasil dibuat",
          id: userId,
          username,
          nama: userName,
          role: userRole,
          beban: bebanArray,
        });
      }

      const placeholders = bebanArray.map(() => "?").join(",");
      const qBeban = `SELECT id, kode FROM beban WHERE kode IN (${placeholders})`;
      db.query(qBeban, bebanArray, (errB, bebanRows) => {
        if (errB) {
          console.error(
            "[user] Failed to resolve beban codes on create:",
            errB
          );
          return res.status(201).json({
            message: "User berhasil dibuat",
            id: userId,
            username,
            nama: userName,
            role: userRole,
            beban: bebanArray,
          });
        }

        if (!bebanRows || bebanRows.length === 0) {
          return res.status(201).json({
            message: "User berhasil dibuat",
            id: userId,
            username,
            nama: userName,
            role: userRole,
            beban: bebanArray,
          });
        }

        const inserts = bebanRows.map((b) => [b.id, userId]);
        const insQ =
          "INSERT IGNORE INTO beban_users (beban_id, user_id) VALUES ?";
        db.query(insQ, [inserts], (insErr) => {
          if (insErr)
            console.error(
              "[user] Failed to insert beban_users on create:",
              insErr
            );
          return res.status(201).json({
            message: "User berhasil dibuat",
            id: userId,
            username,
            nama: userName,
            role: userRole,
            beban: bebanArray,
          });
        });
      });
    }
  );
});

// Change password
// - Admins may change any user's password by providing `newPassword`.
// - Non-admins must provide `oldPassword` and `newPassword` to change their own password.
router.put("/:username/password", (req, res) => {
  const targetUsername = req.params.username;
  const { oldPassword, newPassword } = req.body || {};

  if (
    !newPassword ||
    typeof newPassword !== "string" ||
    newPassword.trim() === ""
  ) {
    return res.status(400).json({ message: "newPassword diperlukan" });
  }

  const requesterRole =
    req.cookies && req.cookies.role
      ? req.cookies.role.toString().toLowerCase()
      : null;

  // If requester is admin, allow direct change
  if (requesterRole === "admin") {
    const q = "UPDATE user SET password = ? WHERE username = ?";
    db.query(q, [newPassword, targetUsername], (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "User tidak ditemukan" });
      return res.json({ message: "Password berhasil diubah (admin)" });
    });
    return;
  }

  // Non-admin: require oldPassword and verify ownership via oldPassword match
  if (!oldPassword) {
    return res
      .status(400)
      .json({ message: "oldPassword diperlukan untuk non-admin" });
  }

  const qCheck = "SELECT password FROM user WHERE username = ?";
  db.query(qCheck, [targetUsername], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });
    const current = rows[0].password ?? rows[0].Password;
    if (current !== oldPassword) {
      return res.status(401).json({ message: "oldPassword salah" });
    }

    const qUpdate = "UPDATE user SET password = ? WHERE username = ?";
    db.query(qUpdate, [newPassword, targetUsername], (err2, result2) => {
      if (err2) return res.status(500).json(err2);
      if (result2.affectedRows === 0)
        return res.status(404).json({ message: "User tidak ditemukan" });
      return res.json({ message: "Password berhasil diubah" });
    });
  });
});

// Admin: replace/set a user's Beban
router.put("/:username/beban", requireAdmin, (req, res) => {
  const targetUsername = req.params.username;
  const { beban } = req.body || {};

  // Debug logging for incoming beban update requests
  try {
    console.log("[user.beban.update] targetUsername:", targetUsername);
    console.log("[user.beban.update] incoming headers:", {
      x_role: req.headers["x-role"] || req.headers["role"],
      x_username: req.headers["x-username"] || null,
    });
    console.log("[user.beban.update] body:", req.body);
  } catch (e) {
    /* ignore logging errors */
  }

  if (!beban) {
    return res.status(400).json({ message: "field beban diperlukan" });
  }

  // Normalize beban input to array
  let bebanArray = [];
  if (Array.isArray(beban)) {
    bebanArray = beban;
  } else if (typeof beban === "string") {
    const trimmed = beban.trim();
    if (trimmed.startsWith("[")) {
      try {
        bebanArray = JSON.parse(trimmed);
      } catch (e) {
        // fallback to CSV/single
      }
    }
    if (bebanArray.length === 0) {
      if (trimmed.includes(",")) {
        bebanArray = trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (trimmed !== "") {
        bebanArray = [trimmed];
      }
    }
  }

  const bebanJson = bebanArray.length > 0 ? JSON.stringify(bebanArray) : null;

  const q = "UPDATE user SET Beban = ? WHERE username = ?";
  db.query(q, [bebanJson, targetUsername], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });
    // Also synchronize beban_users mapping so maintenance notifications work
    // Find user id first
    db.query(
      "SELECT id FROM user WHERE username = ? LIMIT 1",
      [targetUsername],
      (err2, rows2) => {
        if (err2) {
          console.error(
            "[user] Failed to lookup user id for beban_users sync:",
            err2
          );
          return res.json({
            message: "Beban user diperbarui",
            username: targetUsername,
            beban: bebanArray,
          });
        }
        if (!rows2 || rows2.length === 0) {
          return res.json({
            message: "Beban user diperbarui",
            username: targetUsername,
            beban: bebanArray,
          });
        }
        const userId = rows2[0].id;

        // Resolve beban codes to beban ids
        if (!bebanArray || bebanArray.length === 0) {
          // remove any existing mappings for this user
          db.query(
            "DELETE FROM beban_users WHERE user_id = ?",
            [userId],
            (dErr) => {
              if (dErr)
                console.error("[user] Failed to clear beban_users:", dErr);
              return res.json({
                message: "Beban user diperbarui",
                username: targetUsername,
                beban: bebanArray,
              });
            }
          );
          return;
        }

        const placeholders = bebanArray.map(() => "?").join(",");
        const qBeban = `SELECT id, kode FROM beban WHERE kode IN (${placeholders})`;
        db.query(qBeban, bebanArray, (errB, bebanRows) => {
          if (errB) {
            console.error("[user] Failed to resolve beban codes:", errB);
            return res.json({
              message: "Beban user diperbarui",
              username: targetUsername,
              beban: bebanArray,
            });
          }

          // Delete any existing mappings for this user, then insert new ones
          db.query(
            "DELETE FROM beban_users WHERE user_id = ?",
            [userId],
            (dErr) => {
              if (dErr)
                console.error("[user] Failed to clear beban_users:", dErr);

              if (!bebanRows || bebanRows.length === 0) {
                return res.json({
                  message: "Beban user diperbarui",
                  username: targetUsername,
                  beban: bebanArray,
                });
              }

              const inserts = bebanRows.map((b) => [b.id, userId]);
              const insQ =
                "INSERT IGNORE INTO beban_users (beban_id, user_id) VALUES ?";
              db.query(insQ, [inserts], (insErr) => {
                if (insErr)
                  console.error("[user] Failed to insert beban_users:", insErr);
                return res.json({
                  message: "Beban user diperbarui",
                  username: targetUsername,
                  beban: bebanArray,
                });
              });
            }
          );
        });
      }
    );
  });
});

export default router;
