import express from "express";
import db from "../db.js";
import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
  isSameLocation,
  buildBebanFilterSQL,
} from "./middleware/auth.js";
import {
  getApprovalStatus,
  notifyAdminsForApproval,
} from "./middleware/approval.js";

const router = express.Router();

// Helper function to log riwayat
function logRiwayat(
  jenisAksi,
  userId,
  role,
  asetId,
  perubahan,
  tabelRef = "rusak",
  recordId = null,
  callback
) {
  const q = `INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const perubahanJson = perubahan ? JSON.stringify(perubahan) : null;
  db.query(
    q,
    [jenisAksi, userId, role, asetId, perubahanJson, tabelRef, recordId],
    (err, result) => {
      if (err) console.error("[riwayat] Error logging:", err);
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

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  };

  return {
    id: r.id ?? null,
    aset_id: r.aset_id ?? null,
    AsetId: r.AsetId ?? null,
    NamaAset: r.NamaAset ?? null,
    TglRusak: formatDate(r.TglRusak),
    Kerusakan: r.Kerusakan ?? null,
    catatan: r.catatan ?? null,
    approval_status: r.approval_status ?? null,
    approval_date: formatDate(r.approval_date),
  };
}

// GET list
router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query(
      "SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id",
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows.map(mapRow));
      }
    );
    return;
  }
  const beban = getBebanListFromRequest(req);
  if (!beban || beban.length === 0) {
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  }
  const { clause, params } = buildBebanFilterSQL("b.kode", beban);
  const q = `SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause}`;
  db.query(q, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

// GET by AsetId
router.get("/aset/:asetId", requireUserOrAdmin, (req, res) => {
  const { asetId } = req.params;
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query(
      "SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id WHERE a.AsetId = ?",
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
  const { clause, params } = buildBebanFilterSQL("b.kode", beban);
  const q = `SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause} AND a.AsetId = ?`;
  params.push(asetId);
  db.query(q, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

// GET by id
router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const q =
    "SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id WHERE r.id = ?";
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Data rusak tidak ditemukan" });
    const r = rows[0];
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(mapRow(r));
    const beban = getBebanListFromRequest(req);
    if (!beban || beban.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const qAset =
      "SELECT a.id, b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.AsetId = ?";
    db.query(qAset, [r.AsetId], (err2, rows2) => {
      if (err2) return res.status(500).json(err2);
      if (!rows2 || rows2.length === 0)
        return res.status(404).json({ message: "Parent aset tidak ditemukan" });
      const asetBeban = rows2[0].beban_kode ?? null;
      if (!isSameLocation(asetBeban ?? "", beban))
        return res.status(404).json({ message: "Data rusak tidak ditemukan" });
      res.json(mapRow(r));
    });
  });
});

// POST create
router.post("/", requireUserOrAdmin, (req, res) => {
  const data = req.body;
  if (!data || !data.AsetId || !data.TglRusak) {
    return res.status(400).json({ message: "AsetId dan TglRusak diperlukan" });
  }
  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);
  const checkAsetQ =
    "SELECT a.id, b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.AsetId = ?";
  db.query(checkAsetQ, [data.AsetId], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    const asetDbId = rows[0].id;
    const asetBeban = rows[0].beban_kode ?? null;
    if (role !== "admin" && !isSameLocation(asetBeban ?? "", beban)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: tidak punya akses ke Aset ini" });
    }

    const username = req.cookies?.username || req.headers["x-username"];

    const insertRusak = (uid) => {
      const approvalStatus = getApprovalStatus(role);

      const q = `INSERT INTO rusak (aset_id, TglRusak, Kerusakan, catatan, approval_status, approval_date) VALUES (?, ?, ?, ?, ?, ?)`;
      const vals = [
        asetDbId,
        data.TglRusak,
        data.Kerusakan ?? null,
        data.catatan ?? null,
        approvalStatus,
        approvalStatus === "disetujui" ? new Date() : null,
      ];
      db.query(q, vals, (err2, result) => {
        if (err2) return res.status(500).json(err2);

        const rusakId = result.insertId;

        // Update StatusAset to 'rusak' only when created as 'disetujui' (admin-created)
        if (approvalStatus === "disetujui") {
          db.query(
            "UPDATE aset SET StatusAset = 'rusak' WHERE AsetId = ?",
            [data.AsetId],
            (errUpdate) => {
              if (errUpdate) {
                console.error("[rusak] Error updating aset:", errUpdate);
              } else {
                console.log(
                  `[rusak] Set StatusAset='rusak' for AsetId=${data.AsetId}`
                );
              }
            }
          );
        }

        db.query(
          "SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id WHERE r.id = ?",
          [rusakId],
          (err3, rows3) => {
            if (err3) return res.status(500).json(err3);

            // Log riwayat
            if (username) {
              getUserIdFromUsername(username, (err4, userData) => {
                if (!err4 && userData) {
                  logRiwayat(
                    "rusak_input",
                    userData.id,
                    userData.role,
                    asetDbId,
                    {
                      TglRusak: data.TglRusak,
                      Kerusakan: data.Kerusakan,
                      catatan: data.catatan,
                    },
                    "rusak",
                    rusakId
                  );

                  // Notify admins if user submission
                  if (
                    userData.role !== "admin" &&
                    approvalStatus === "diajukan"
                  ) {
                    notifyAdminsForApproval(
                      "rusak",
                      rusakId,
                      data.AsetId,
                      `User ${username} melaporkan aset rusak: ${
                        data.AsetId
                      } - ${data.Kerusakan || "tanpa keterangan"}`
                    );
                  }
                }
              });
            }

            res.status(201).json({
              message: "Data kerusakan ditambahkan",
              rusak: mapRow(rows3[0]),
            });
          }
        );
      });
    };

    if (username) {
      getUserIdFromUsername(username, (errUser, userData) => {
        insertRusak(errUser || !userData ? null : userData.id);
      });
    } else {
      insertRusak(null);
    }
  });
});

// PUT update (admin only)
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;

  db.query("SELECT * FROM rusak WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Data rusak tidak ditemukan" });

    const old = rows[0];
    const updates = [];
    const values = [];
    const changes = {};

    const normalizeValue = (val) => {
      if (val === null || val === undefined) return null;
      if (val instanceof Date) return val.toISOString().split("T")[0];
      if (typeof val === "string") {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      }
      return val;
    };

    const fields = ["TglRusak", "Kerusakan", "catatan"];
    fields.forEach((field) => {
      if (data[field] !== undefined) {
        const oldVal = normalizeValue(old[field]);
        const newVal = normalizeValue(data[field]);
        if (oldVal !== newVal) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
          changes[field] = { before: oldVal, after: newVal };
        }
      }
    });

    if (updates.length === 0) {
      return res.json({ message: "Tidak ada perubahan", rusak: mapRow(old) });
    }

    values.push(id);
    const q = `UPDATE rusak SET ${updates.join(", ")} WHERE id = ?`;
    db.query(q, values, (err2) => {
      if (err2) return res.status(500).json(err2);

      db.query(
        "SELECT r.*, a.AsetId, a.NamaAset FROM rusak r LEFT JOIN aset a ON r.aset_id = a.id WHERE r.id = ?",
        [id],
        (err3, rows3) => {
          if (err3) return res.status(500).json(err3);

          const username = req.cookies?.username || req.headers["x-username"];
          if (username) {
            getUserIdFromUsername(username, (err4, userData) => {
              if (!err4 && userData) {
                logRiwayat(
                  "rusak_edit",
                  userData.id,
                  userData.role,
                  old.aset_id,
                  changes,
                  "rusak",
                  id
                );
              }
            });
          }

          res.json({
            message: "Data kerusakan diperbarui",
            rusak: mapRow(rows3[0]),
          });
        }
      );
    });
  });
});

// DELETE (admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM rusak WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Data rusak tidak ditemukan" });

    const record = rows[0];

    db.query("DELETE FROM rusak WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json(err2);

      const username = req.cookies?.username || req.headers["x-username"];
      if (username) {
        getUserIdFromUsername(username, (err3, userData) => {
          if (!err3 && userData) {
            logRiwayat(
              "rusak_delete",
              userData.id,
              userData.role,
              record.aset_id,
              null,
              "rusak",
              id
            );
          }
        });
      }

      res.json({ message: "Data kerusakan dihapus" });
    });
  });
});

export default router;
