import express from "express";
import db from "../db.js";
import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
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
  tabelRef = "mutasi",
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
    aset_id: r.aset_id ?? null,
    AsetId: r.AsetId ?? null,
    NamaAset: r.NamaAset ?? null,
    beban_kode: r.beban_kode ?? null,
    TglMutasi: formatDate(r.TglMutasi),
    departemen_asal_id: r.departemen_asal_id ?? null,
    departemen_asal_kode: r.departemen_asal_kode ?? null,
    departemen_asal_nama: r.departemen_asal_nama ?? null,
    departemen_tujuan_id: r.departemen_tujuan_id ?? null,
    departemen_tujuan_kode: r.departemen_tujuan_kode ?? null,
    departemen_tujuan_nama: r.departemen_tujuan_nama ?? null,
    ruangan_asal: r.ruangan_asal ?? null,
    ruangan_tujuan: r.ruangan_tujuan ?? null,
    alasan: r.alasan ?? null,
    catatan: r.catatan ?? null,
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  };
}

// Logging
router.use((req, res, next) => {
  const role = getRoleFromRequest(req) || "(none)";
  const beban = getBebanListFromRequest(req) || ["(none)"];
  console.log(
    `[mutasi] ${req.method} ${req.originalUrl} - role=${role} beban=${beban}`
  );
  next();
});

// GET list: admin sees all; user sees mutations for assets in their Beban
router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    const q = `
      SELECT 
        m.*,
        a.AsetId,
        a.NamaAset,
        b.kode as beban_kode,
        d_asal.kode as departemen_asal_kode,
        d_asal.nama as departemen_asal_nama,
        d_tujuan.kode as departemen_tujuan_kode,
        d_tujuan.nama as departemen_tujuan_nama
      FROM mutasi m
      LEFT JOIN aset a ON m.aset_id = a.id
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d_asal ON m.departemen_asal_id = d_asal.id
      LEFT JOIN departemen d_tujuan ON m.departemen_tujuan_id = d_tujuan.id
      ORDER BY m.TglMutasi DESC, m.id DESC
    `;
    db.query(q, (err, rows) => {
      if (err) return res.status(500).json(err);
      return res.json(rows.map(mapRow));
    });
  } else {
    const bebanList = getBebanListFromRequest(req);
    if (!bebanList || bebanList.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const { clause, params } = buildBebanFilterSQL("b.kode", bebanList);
    const q = `
      SELECT 
        m.*,
        a.AsetId,
        a.NamaAset,
        b.kode as beban_kode,
        d_asal.kode as departemen_asal_kode,
        d_asal.nama as departemen_asal_nama,
        d_tujuan.kode as departemen_tujuan_kode,
        d_tujuan.nama as departemen_tujuan_nama
      FROM mutasi m
      LEFT JOIN aset a ON m.aset_id = a.id
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d_asal ON m.departemen_asal_id = d_asal.id
      LEFT JOIN departemen d_tujuan ON m.departemen_tujuan_id = d_tujuan.id
      WHERE ${clause}
      ORDER BY m.TglMutasi DESC, m.id DESC
    `;
    db.query(q, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      return res.json(rows.map(mapRow));
    });
  }
});

// GET by aset/:asetId
router.get("/aset/:asetId", requireUserOrAdmin, (req, res) => {
  const { asetId } = req.params;
  const role = getRoleFromRequest(req);

  if (role === "admin") {
    const q = `
      SELECT 
        m.*,
        a.AsetId,
        a.NamaAset,
        b.kode as beban_kode,
        d_asal.kode as departemen_asal_kode,
        d_asal.nama as departemen_asal_nama,
        d_tujuan.kode as departemen_tujuan_kode,
        d_tujuan.nama as departemen_tujuan_nama
      FROM mutasi m
      LEFT JOIN aset a ON m.aset_id = a.id
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d_asal ON m.departemen_asal_id = d_asal.id
      LEFT JOIN departemen d_tujuan ON m.departemen_tujuan_id = d_tujuan.id
      WHERE a.AsetId = ?
      ORDER BY m.TglMutasi DESC, m.id DESC
    `;
    db.query(q, [asetId], (err, rows) => {
      if (err) return res.status(500).json(err);
      return res.json(rows.map(mapRow));
    });
  } else {
    const bebanList = getBebanListFromRequest(req);
    if (!bebanList || bebanList.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const { clause, params: baseParams } = buildBebanFilterSQL(
      "b.kode",
      bebanList
    );
    const q = `
      SELECT 
        m.*,
        a.AsetId,
        a.NamaAset,
        b.kode as beban_kode,
        d_asal.kode as departemen_asal_kode,
        d_asal.nama as departemen_asal_nama,
        d_tujuan.kode as departemen_tujuan_kode,
        d_tujuan.nama as departemen_tujuan_nama
      FROM mutasi m
      LEFT JOIN aset a ON m.aset_id = a.id
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d_asal ON m.departemen_asal_id = d_asal.id
      LEFT JOIN departemen d_tujuan ON m.departemen_tujuan_id = d_tujuan.id
      WHERE ${clause} AND a.AsetId = ?
      ORDER BY m.TglMutasi DESC, m.id DESC
    `;
    db.query(q, [...baseParams, asetId], (err, rows) => {
      if (err) return res.status(500).json(err);
      return res.json(rows.map(mapRow));
    });
  }
});

// GET by id
router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const role = getRoleFromRequest(req);

  if (role === "admin") {
    const q = `
      SELECT 
        m.*,
        a.AsetId,
        a.NamaAset,
        b.kode as beban_kode,
        d_asal.kode as departemen_asal_kode,
        d_asal.nama as departemen_asal_nama,
        d_tujuan.kode as departemen_tujuan_kode,
        d_tujuan.nama as departemen_tujuan_nama
      FROM mutasi m
      LEFT JOIN aset a ON m.aset_id = a.id
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d_asal ON m.departemen_asal_id = d_asal.id
      LEFT JOIN departemen d_tujuan ON m.departemen_tujuan_id = d_tujuan.id
      WHERE m.id = ?
    `;
    db.query(q, [id], (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "Mutasi tidak ditemukan" });
      }
      return res.json(mapRow(rows[0]));
    });
  } else {
    const bebanList = getBebanListFromRequest(req);
    if (!bebanList || bebanList.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const { clause, params: baseParams } = buildBebanFilterSQL(
      "b.kode",
      bebanList
    );
    const q = `
      SELECT 
        m.*,
        a.AsetId,
        a.NamaAset,
        b.kode as beban_kode,
        d_asal.kode as departemen_asal_kode,
        d_asal.nama as departemen_asal_nama,
        d_tujuan.kode as departemen_tujuan_kode,
        d_tujuan.nama as departemen_tujuan_nama
      FROM mutasi m
      LEFT JOIN aset a ON m.aset_id = a.id
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d_asal ON m.departemen_asal_id = d_asal.id
      LEFT JOIN departemen d_tujuan ON m.departemen_tujuan_id = d_tujuan.id
      WHERE ${clause} AND m.id = ?
    `;
    db.query(q, [...baseParams, id], (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "Mutasi tidak ditemukan" });
      }
      return res.json(mapRow(rows[0]));
    });
  }
});

// POST create
router.post("/", requireUserOrAdmin, (req, res) => {
  const username = req.headers["x-username"] || req.cookies.username || null;
  const role = getRoleFromRequest(req);

  getUserIdFromUsername(username, (errUser, user) => {
    if (errUser || !user) {
      return res
        .status(401)
        .json({ message: "User tidak ditemukan", error: errUser?.message });
    }

    const {
      aset_id,
      TglMutasi,
      departemen_asal_id,
      departemen_tujuan_id,
      ruangan_asal,
      ruangan_tujuan,
      alasan,
      catatan,
    } = req.body;

    if (!aset_id || !TglMutasi) {
      return res
        .status(400)
        .json({ message: "aset_id dan TglMutasi wajib diisi" });
    }

    // Verify asset exists and user has access
    if (role !== "admin") {
      const bebanList = getBebanListFromRequest(req);
      if (!bebanList || bebanList.length === 0) {
        return res
          .status(403)
          .json({ message: "Akses ditolak: beban tidak ditemukan" });
      }
      const { clause, params: baseParams } = buildBebanFilterSQL(
        "b.kode",
        bebanList
      );
      const checkQ = `SELECT a.id, a.AsetId FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause} AND a.id = ?`;
      db.query(checkQ, [...baseParams, aset_id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (!rows || rows.length === 0) {
          return res
            .status(403)
            .json({ message: "Akses ditolak: aset tidak ditemukan" });
        }
        insertMutasi();
      });
    } else {
      insertMutasi();
    }

    function insertMutasi() {
      // First, get current departemen and lokasi from aset
      db.query(
        "SELECT departemen_id, Lokasi FROM aset WHERE id = ?",
        [aset_id],
        (errAset, asetRows) => {
          if (errAset) return res.status(500).json(errAset);
          if (!asetRows || asetRows.length === 0) {
            return res.status(404).json({ message: "Aset tidak ditemukan" });
          }

          const currentDepartemen = asetRows[0].departemen_id;
          const currentLokasi = asetRows[0].Lokasi;

          // Use departemen_asal from request, or fall back to current aset departemen
          const finalDepartemenAsal = departemen_asal_id || currentDepartemen;
          // Use ruangan_asal from request, or fall back to current aset Lokasi
          const finalRuanganAsal = ruangan_asal || currentLokasi;

          const q = `
            INSERT INTO mutasi 
            (aset_id, TglMutasi, departemen_asal_id, departemen_tujuan_id, ruangan_asal, ruangan_tujuan, alasan, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(
            q,
            [
              aset_id,
              TglMutasi,
              finalDepartemenAsal,
              departemen_tujuan_id || null,
              finalRuanganAsal,
              ruangan_tujuan || null,
              alasan || null,
              catatan || null,
            ],
            (err, result) => {
              if (err) return res.status(500).json(err);

              const mutasiId = result.insertId;

              // Get aset info for riwayat
              db.query(
                "SELECT a.id, a.AsetId FROM aset a WHERE a.id = ?",
                [aset_id],
                (errAset2, asetRows2) => {
                  if (errAset2) {
                    console.error(
                      "[mutasi] Error getting aset info:",
                      errAset2
                    );
                  }

                  const asetIdStr = asetRows2?.[0]?.AsetId || null;

                  // Log to riwayat
                  logRiwayat(
                    "mutasi",
                    user.id,
                    role,
                    aset_id,
                    {
                      TglMutasi,
                      departemen_asal_id: finalDepartemenAsal,
                      departemen_tujuan_id,
                      ruangan_asal: finalRuanganAsal,
                      ruangan_tujuan,
                      alasan,
                      catatan,
                    },
                    "mutasi",
                    mutasiId
                  );

                  return res.json({
                    id: mutasiId,
                    message: "Mutasi created successfully",
                  });
                }
              );
            }
          );
        }
      );
    }
  });
});

// PUT update (Admin only)
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const username = req.headers["x-username"] || req.cookies.username || null;
  const role = getRoleFromRequest(req);

  getUserIdFromUsername(username, (errUser, user) => {
    if (errUser || !user) {
      return res
        .status(401)
        .json({ message: "User tidak ditemukan", error: errUser?.message });
    }

    const {
      TglMutasi,
      departemen_asal_id,
      departemen_tujuan_id,
      ruangan_asal,
      ruangan_tujuan,
      alasan,
      catatan,
    } = req.body;

    // Get current data for riwayat
    db.query("SELECT * FROM mutasi WHERE id = ?", [id], (errGet, oldRows) => {
      if (errGet) return res.status(500).json(errGet);
      if (!oldRows || oldRows.length === 0) {
        return res.status(404).json({ message: "Mutasi tidak ditemukan" });
      }

      const oldData = oldRows[0];
      const updates = [];
      const values = [];

      if (TglMutasi !== undefined) {
        updates.push("TglMutasi = ?");
        values.push(TglMutasi);
      }
      if (departemen_asal_id !== undefined) {
        updates.push("departemen_asal_id = ?");
        values.push(departemen_asal_id || null);
      }
      if (departemen_tujuan_id !== undefined) {
        updates.push("departemen_tujuan_id = ?");
        values.push(departemen_tujuan_id || null);
      }
      if (ruangan_asal !== undefined) {
        updates.push("ruangan_asal = ?");
        values.push(ruangan_asal || null);
      }
      if (ruangan_tujuan !== undefined) {
        updates.push("ruangan_tujuan = ?");
        values.push(ruangan_tujuan || null);
      }
      if (alasan !== undefined) {
        updates.push("alasan = ?");
        values.push(alasan || null);
      }
      if (catatan !== undefined) {
        updates.push("catatan = ?");
        values.push(catatan || null);
      }

      if (updates.length === 0) {
        return res
          .status(400)
          .json({ message: "Tidak ada data untuk diupdate" });
      }

      values.push(id);
      const q = `UPDATE mutasi SET ${updates.join(", ")} WHERE id = ?`;

      db.query(q, values, (err) => {
        if (err) return res.status(500).json(err);

        return res.json({ message: "Mutasi updated successfully" });
      });
    });
  });
});

// DELETE (Admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const username = req.headers["x-username"] || req.cookies.username || null;
  const role = getRoleFromRequest(req);

  getUserIdFromUsername(username, (errUser, user) => {
    if (errUser || !user) {
      return res
        .status(401)
        .json({ message: "User tidak ditemukan", error: errUser?.message });
    }

    // Get data for riwayat before deletion
    db.query("SELECT * FROM mutasi WHERE id = ?", [id], (errGet, rows) => {
      if (errGet) return res.status(500).json(errGet);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "Mutasi tidak ditemukan" });
      }

      const oldData = rows[0];

      db.query("DELETE FROM mutasi WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json(err);

        return res.json({ message: "Mutasi deleted successfully" });
      });
    });
  });
});

export default router;
