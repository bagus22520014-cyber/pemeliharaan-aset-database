import express from "express";
import db from "../db.js";
import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
  getBebanPrefix,
  isSameLocation,
  buildBebanFilterSQL,
} from "./middleware/auth.js";

const router = express.Router();

// Helper function to log riwayat
function logRiwayat(
  jenisAksi,
  userId,
  role,
  asetId,
  perubahan,
  tabelRef = "perbaikan",
  recordId = null,
  callback
) {
  const q = `INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const perubahanJson = perubahan ? JSON.stringify(perubahan) : null;
  db.query(
    q,
    [jenisAksi, userId, role, asetId, perubahanJson, tabelRef, recordId],
    (err, result) => {
      if (err) {
        console.error("[riwayat] Error logging:", err);
      } else {
        console.log(
          `[riwayat] Logged ${jenisAksi} for ${tabelRef} aset_id=${asetId} record_id=${recordId} by user_id=${userId}`
        );
      }
      if (callback) callback(err, result);
    }
  );
}

// Helper function to create notification
function createNotification(
  userId,
  beban,
  tipe,
  judul,
  pesan,
  link = null,
  tabelRef = null,
  recordId = null,
  callback
) {
  const q = `INSERT INTO notification (user_id, beban, tipe, judul, pesan, link, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(
    q,
    [userId, beban, tipe, judul, pesan, link, tabelRef, recordId],
    (err, result) => {
      if (err) {
        console.error("[notification] Error creating:", err);
      } else {
        console.log(
          `[notification] Created ${tipe} notification for user_id=${userId} beban=${beban}`
        );
      }
      if (callback) callback(err, result);
    }
  );
}

// Helper to get user_id from username
function getUserIdFromUsername(username, callback) {
  if (!username) return callback(new Error("Username not provided"));
  db.query(
    "SELECT id, role FROM user WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return callback(err);
      if (!rows || rows.length === 0)
        return callback(new Error("User not found"));
      callback(null, rows[0]);
    }
  );
}

function mapRow(r) {
  if (!r) return r;

  // Helper to format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  };

  return {
    id: r.id ?? null,
    AsetId: r.AsetId ?? null,
    tanggal: formatDate(r.tanggal),
    PurchaseOrder: r.PurchaseOrder ?? null,
    vendor: r.vendor ?? null,
    bagian: r.bagian ?? null,
    nominal: r.nominal ?? null,
  };
}

// Logging
router.use((req, res, next) => {
  const role = getRoleFromRequest(req) || "(none)";
  const beban = getBebanListFromRequest(req) || ["(none)"];
  console.log(
    `[perbaikan] ${req.method} ${req.originalUrl} - role=${role} beban=${beban}`
  );
  next();
});

// GET list: admin sees all; user sees repairs for assets in their Beban
router.get("/", requireUserOrAdmin, (req, res) => {
  const queryAset =
    req.query.asetId || req.query.AsetId || req.query.aset || null;
  if (queryAset) {
    // Handle request to list perbaikan for a specific AsetId
    const roleQ = getRoleFromRequest(req);
    if (roleQ === "admin") {
      db.query(
        "SELECT * FROM perbaikan WHERE AsetId = ?",
        [queryAset],
        (err, rows) => {
          if (err) return res.status(500).json(err);
          return res.json(rows.map(mapRow));
        }
      );
      return;
    }
    const bebanQ = getBebanListFromRequest(req);
    if (!bebanQ || bebanQ.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const { clause, params: baseParams } = buildBebanFilterSQL(
      "a.Beban",
      bebanQ
    );
    const q = `SELECT p.* FROM perbaikan p JOIN aset a ON a.AsetId = p.AsetId WHERE ${clause} AND p.AsetId = ?`;
    const params = [...baseParams, queryAset];
    db.query(q, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows.map(mapRow));
    });
    return;
  }
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query("SELECT * FROM perbaikan", (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows.map(mapRow));
    });
    return;
  }
  const beban = getBebanListFromRequest(req);
  if (!beban || beban.length === 0) {
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  }
  const { clause, params } = buildBebanFilterSQL("a.Beban", beban);
  const q = `SELECT p.* FROM perbaikan p JOIN aset a ON a.AsetId = p.AsetId WHERE ${clause}`;
  db.query(q, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

// GET by id
// GET perbaikan by AsetId (useful shorthand)
router.get("/aset/:asetId", requireUserOrAdmin, (req, res) => {
  const { asetId } = req.params;
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query(
      "SELECT * FROM perbaikan WHERE AsetId = ?",
      [asetId],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        return res.json(rows.map(mapRow));
      }
    );
    return;
  }
  const beban = getBebanListFromRequest(req);
  if (!beban || beban.length === 0)
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  const { clause, params } = buildBebanFilterSQL("a.Beban", beban);
  const q = `SELECT p.* FROM perbaikan p JOIN aset a ON a.AsetId = p.AsetId WHERE ${clause} AND p.AsetId = ?`;
  params.push(asetId);
  db.query(q, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const q = "SELECT p.* FROM perbaikan p WHERE p.id = ?";
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
    const p = rows[0];
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(mapRow(p));
    const beban = getBebanListFromRequest(req);
    if (!beban || beban.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const qAset = "SELECT Beban FROM aset WHERE AsetId = ?";
    db.query(qAset, [p.AsetId], (err2, rows2) => {
      if (err2) return res.status(500).json(err2);
      if (!rows2 || rows2.length === 0)
        return res.status(404).json({ message: "Parent aset tidak ditemukan" });
      const asetBeban = rows2[0].Beban ?? null;
      if (!isSameLocation(asetBeban ?? "", beban))
        return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
      res.json(mapRow(p));
    });
  });
});

// Create perbaikan (user or admin). Check asset Beban for user.
router.post("/", requireUserOrAdmin, (req, res) => {
  const data = req.body;
  if (!data || !data.AsetId || !data.tanggal) {
    return res.status(400).json({ message: "AsetId dan tanggal diperlukan" });
  }
  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);
  const checkAsetQ = "SELECT Beban FROM aset WHERE AsetId = ?";
  db.query(checkAsetQ, [data.AsetId], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    const asetBeban = rows[0].Beban ?? null;
    if (role !== "admin" && !isSameLocation(asetBeban ?? "", beban)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: tidak punya akses ke Aset ini" });
    }
    const q = `INSERT INTO perbaikan (AsetId, tanggal, PurchaseOrder, vendor, bagian, nominal) VALUES (?, ?, ?, ?, ?, ?)`;
    const vals = [
      data.AsetId,
      data.tanggal,
      data.PurchaseOrder ?? null,
      data.vendor ?? null,
      data.bagian ?? null,
      data.nominal ?? null,
    ];
    db.query(q, vals, (err2, result) => {
      if (err2) return res.status(500).json(err2);

      const perbaikanId = result.insertId;

      db.query(
        "SELECT * FROM perbaikan WHERE id = ?",
        [perbaikanId],
        (err3, rows3) => {
          if (err3) return res.status(500).json(err3);

          // Log riwayat
          const username = req.cookies.username || req.headers["x-username"];
          if (username) {
            getUserIdFromUsername(username, (err4, userData) => {
              if (!err4 && userData) {
                // Get aset.id for logging
                db.query(
                  "SELECT id FROM aset WHERE AsetId = ?",
                  [data.AsetId],
                  (err5, asetRows) => {
                    if (!err5 && asetRows && asetRows.length > 0) {
                      const asetDbId = asetRows[0].id;
                      logRiwayat(
                        "perbaikan_input",
                        userData.id,
                        userData.role,
                        asetDbId,
                        null,
                        "perbaikan",
                        perbaikanId
                      );

                      // Create notification for the beban
                      createNotification(
                        null, // broadcast to beban
                        asetBeban,
                        "info",
                        "Perbaikan Baru Ditambahkan",
                        `Perbaikan untuk aset ${data.AsetId} telah ditambahkan oleh ${username}`,
                        `/perbaikan/${perbaikanId}`,
                        "perbaikan",
                        perbaikanId
                      );
                    }
                  }
                );
              }
            });
          }

          res.status(201).json({
            message: "Perbaikan ditambahkan",
            perbaikan: mapRow(rows3[0]),
          });
        }
      );
    });
  });
});

// Update perbaikan (admin only)
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const qSelect = "SELECT * FROM perbaikan WHERE id = ?";
  db.query(qSelect, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Perbaikan tidak ditemukan" });

    const current = rows[0];

    const values = [
      data.AsetId,
      data.tanggal,
      data.PurchaseOrder,
      data.vendor,
      data.bagian,
      data.nominal,
      id,
    ];
    const q = `UPDATE perbaikan SET AsetId = COALESCE(?, AsetId), tanggal = COALESCE(?, tanggal), PurchaseOrder = COALESCE(?, PurchaseOrder), vendor = COALESCE(?, vendor), bagian = COALESCE(?, bagian), nominal = COALESCE(?, nominal) WHERE id = ?`;
    db.query(q, values, (err2, result) => {
      if (err2) return res.status(500).json(err2);
      db.query("SELECT * FROM perbaikan WHERE id = ?", [id], (err3, rows3) => {
        if (err3) return res.status(500).json(err3);

        // Log riwayat with changes
        const username = req.cookies.username || req.headers["x-username"];
        if (username) {
          getUserIdFromUsername(username, (err4, userData) => {
            if (!err4 && userData) {
              // Helper to normalize values for comparison
              const normalizeValue = (value, field) => {
                if (value === null || value === undefined) return null;
                // Normalize date fields to YYYY-MM-DD format for comparison
                if (field === "tanggal") {
                  const d = new Date(value);
                  if (!isNaN(d.getTime())) {
                    return d.toISOString().split("T")[0];
                  }
                }
                return value;
              };

              // Build perubahan object
              const perubahan = {};
              const updated = rows3[0];
              const fields = [
                "AsetId",
                "tanggal",
                "PurchaseOrder",
                "vendor",
                "bagian",
                "nominal",
              ];

              fields.forEach((field) => {
                if (data[field] !== undefined) {
                  const normalizedCurrent = normalizeValue(
                    current[field],
                    field
                  );
                  const normalizedUpdated = normalizeValue(
                    updated[field],
                    field
                  );

                  if (normalizedCurrent !== normalizedUpdated) {
                    perubahan[field] = {
                      before: current[field],
                      after: updated[field],
                    };
                  }
                }
              });

              if (Object.keys(perubahan).length > 0) {
                // Get aset.id for logging
                db.query(
                  "SELECT id, Beban FROM aset WHERE AsetId = ?",
                  [updated.AsetId],
                  (err5, asetRows) => {
                    if (!err5 && asetRows && asetRows.length > 0) {
                      const asetDbId = asetRows[0].id;
                      const asetBeban = asetRows[0].Beban;

                      logRiwayat(
                        "perbaikan_edit",
                        userData.id,
                        userData.role,
                        asetDbId,
                        perubahan,
                        "perbaikan",
                        id
                      );

                      // Create notification
                      createNotification(
                        null,
                        asetBeban,
                        "warning",
                        "Perbaikan Diupdate",
                        `Perbaikan untuk aset ${updated.AsetId} telah diupdate oleh ${username}`,
                        `/perbaikan/${id}`,
                        "perbaikan",
                        id
                      );
                    }
                  }
                );
              }
            }
          });
        }

        res.json({
          message: "Perbaikan berhasil diupdate",
          perbaikan: mapRow(rows3[0]),
        });
      });
    });
  });
});

// Delete (admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  // Get perbaikan info before deleting
  db.query(
    "SELECT p.*, a.id as aset_db_id, a.Beban FROM perbaikan p JOIN aset a ON p.AsetId = a.AsetId WHERE p.id = ?",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
      }

      const perbaikan = rows[0];
      const username = req.cookies.username || req.headers["x-username"];

      const q = "DELETE FROM perbaikan WHERE id = ?";
      db.query(q, [id], (err2, r) => {
        if (err2) return res.status(500).json(err2);
        if (r.affectedRows === 0)
          return res.status(404).json({ message: "Perbaikan tidak ditemukan" });

        // Log riwayat
        if (username) {
          getUserIdFromUsername(username, (err3, userData) => {
            if (!err3 && userData) {
              logRiwayat(
                "perbaikan_delete",
                userData.id,
                userData.role,
                perbaikan.aset_db_id,
                { deleted_data: perbaikan },
                "perbaikan",
                id
              );

              // Create notification
              createNotification(
                null,
                perbaikan.Beban,
                "error",
                "Perbaikan Dihapus",
                `Perbaikan untuk aset ${perbaikan.AsetId} telah dihapus oleh ${username}`,
                null,
                "perbaikan",
                id
              );
            }
          });
        }

        res.json({ message: "Perbaikan berhasil dihapus" });
      });
    }
  );
});

export default router;
