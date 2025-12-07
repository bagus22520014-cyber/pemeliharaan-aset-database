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

const router = express.Router();

// Helper function to log riwayat
function logRiwayat(
  jenisAksi,
  userId,
  role,
  asetId,
  perubahan,
  tabelRef = "dipinjam",
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
    Peminjam: r.Peminjam ?? null,
    TglPinjam: formatDate(r.TglPinjam),
    TglKembali: formatDate(r.TglKembali),
    jumlah_dipinjam: r.jumlah_dipinjam ?? null,
    StatusPeminjaman: r.StatusPeminjaman ?? null,
    catatan: r.catatan ?? null,
  };
}

// GET list
router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query(
      "SELECT d.*, a.AsetId, a.NamaAset FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id",
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
  const q = `SELECT d.*, a.AsetId, a.NamaAset FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause}`;
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
      "SELECT d.*, a.AsetId, a.NamaAset FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id WHERE a.AsetId = ?",
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
  const q = `SELECT d.*, a.AsetId, a.NamaAset FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause} AND a.AsetId = ?`;
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
    "SELECT d.*, a.AsetId, a.NamaAset FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id WHERE d.id = ?";
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res
        .status(404)
        .json({ message: "Data peminjaman tidak ditemukan" });
    const d = rows[0];
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(mapRow(d));
    const beban = getBebanListFromRequest(req);
    if (!beban || beban.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const qAset =
      "SELECT a.id, b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.AsetId = ?";
    db.query(qAset, [d.AsetId], (err2, rows2) => {
      if (err2) return res.status(500).json(err2);
      if (!rows2 || rows2.length === 0)
        return res.status(404).json({ message: "Parent aset tidak ditemukan" });
      const asetBeban = rows2[0].beban_kode ?? null;
      if (!isSameLocation(asetBeban ?? "", beban))
        return res
          .status(404)
          .json({ message: "Data peminjaman tidak ditemukan" });
      res.json(mapRow(d));
    });
  });
});

// POST create
router.post("/", requireUserOrAdmin, (req, res) => {
  const data = req.body;
  if (
    !data ||
    !data.AsetId ||
    !data.tanggal_pinjam ||
    !data.peminjam ||
    !data.lokasi_id
  ) {
    return res.status(400).json({
      message: "AsetId, tanggal_pinjam, peminjam, dan lokasi_id diperlukan",
    });
  }
  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);
  const checkAsetQ =
    "SELECT a.id, b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.AsetId = ?";
  db.query(checkAsetQ, [data.AsetId], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    const asetBeban = rows[0].beban_kode ?? null;
    if (role !== "admin" && !isSameLocation(asetBeban ?? "", beban)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: tidak punya akses ke Aset ini" });
    }

    const asetDbId = rows[0].id;
    const jumlahDipinjam = parseInt(data.jumlah_dipinjam) || 1;

    // Check lokasi exists and has enough stock
    db.query(
      "SELECT * FROM aset_lokasi WHERE id = ? AND AsetId = ?",
      [data.lokasi_id, data.AsetId],
      (errLok, lokasiRows) => {
        if (errLok) return res.status(500).json(errLok);
        if (!lokasiRows || lokasiRows.length === 0) {
          return res.status(404).json({ message: "Lokasi tidak ditemukan" });
        }
        const lokasi = lokasiRows[0];
        if (lokasi.jumlah < jumlahDipinjam) {
          return res.status(400).json({
            message: "Stok di lokasi tidak mencukupi",
            available: lokasi.jumlah,
            requested: jumlahDipinjam,
          });
        }

        const username = req.cookies?.username || req.headers["x-username"];

        const insertDipinjam = (uid) => {
          const q = `INSERT INTO dipinjam (aset_id, Peminjam, TglPinjam, TglKembali, jumlah_dipinjam, StatusPeminjaman, catatan, lokasi_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
          const vals = [
            asetDbId,
            data.peminjam,
            data.tanggal_pinjam,
            data.tanggal_kembali ?? null,
            jumlahDipinjam,
            data.status ?? "dipinjam",
            data.keperluan ?? data.catatan ?? null,
            data.lokasi_id,
          ];
          db.query(q, vals, (err2, result) => {
            if (err2) return res.status(500).json(err2);

            const dipinjamId = result.insertId;

            // Decrease lokasi jumlah
            db.query(
              "UPDATE aset_lokasi SET jumlah = GREATEST(jumlah - ?, 0) WHERE id = ?",
              [jumlahDipinjam, data.lokasi_id],
              (errUpdateLok) => {
                if (errUpdateLok) {
                  console.error(
                    "[dipinjam] Error updating lokasi:",
                    errUpdateLok
                  );
                  return res.status(500).json(errUpdateLok);
                }

                // Update total jumlah in aset based on sum of lokasi
                db.query(
                  "UPDATE aset SET jumlah = (SELECT COALESCE(SUM(jumlah), 0) FROM aset_lokasi WHERE AsetId = ?), StatusAset = 'dipinjam' WHERE AsetId = ?",
                  [data.AsetId, data.AsetId],
                  (errUpdate) => {
                    if (errUpdate) {
                      console.error(
                        "[dipinjam] Error updating aset:",
                        errUpdate
                      );
                    } else {
                      console.log(
                        `[dipinjam] Decreased jumlah by ${jumlahDipinjam} from lokasi_id=${data.lokasi_id} and set StatusAset='dipinjam' for AsetId=${data.AsetId}`
                      );
                    }
                  }
                );

                db.query(
                  "SELECT d.*, a.AsetId, a.NamaAset, al.lokasi FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id LEFT JOIN aset_lokasi al ON d.lokasi_id = al.id WHERE d.id = ?",
                  [dipinjamId],
                  (err3, rows3) => {
                    if (err3) return res.status(500).json(err3);

                    // Log riwayat
                    if (username) {
                      getUserIdFromUsername(username, (err4, userData) => {
                        if (!err4 && userData) {
                          logRiwayat(
                            "dipinjam_input",
                            userData.id,
                            userData.role,
                            asetDbId,
                            {
                              lokasi: lokasi.lokasi,
                              lokasi_id: data.lokasi_id,
                              jumlah_dipinjam: jumlahDipinjam,
                            },
                            "dipinjam",
                            dipinjamId
                          );
                        }
                      });
                    }

                    const response = mapRow(rows3[0]);
                    response.lokasi = lokasi.lokasi;
                    response.lokasi_id = data.lokasi_id;

                    res.status(201).json({
                      message: "Data peminjaman ditambahkan",
                      dipinjam: response,
                    });
                  }
                );
              }
            );
          });
        };

        if (username) {
          getUserIdFromUsername(username, (errUser, userData) => {
            insertDipinjam(errUser || !userData ? null : userData.id);
          });
        } else {
          insertDipinjam(null);
        }
      }
    );
  });
});

// PUT update (admin only)
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;

  db.query("SELECT * FROM dipinjam WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res
        .status(404)
        .json({ message: "Data peminjaman tidak ditemukan" });

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

    const fieldMapping = {
      tanggal_pinjam: "TglPinjam",
      tanggal_kembali: "TglKembali",
      peminjam: "Peminjam",
      keperluan: "catatan",
      status: "StatusPeminjaman",
      jumlah_dipinjam: "jumlah_dipinjam",
    };

    Object.keys(fieldMapping).forEach((apiField) => {
      const dbField = fieldMapping[apiField];
      if (data[apiField] !== undefined) {
        const oldVal = normalizeValue(old[dbField]);
        const newVal = normalizeValue(data[apiField]);
        if (oldVal !== newVal) {
          updates.push(`${dbField} = ?`);
          values.push(data[apiField]);
          changes[apiField] = { before: oldVal, after: newVal };
        }
      }
    });

    if (updates.length === 0) {
      return res.json({
        message: "Tidak ada perubahan",
        dipinjam: mapRow(old),
      });
    }

    values.push(id);
    const q = `UPDATE dipinjam SET ${updates.join(", ")} WHERE id = ?`;
    db.query(q, values, (err2) => {
      if (err2) return res.status(500).json(err2);

      db.query(
        "SELECT d.*, a.AsetId, a.NamaAset FROM dipinjam d LEFT JOIN aset a ON d.aset_id = a.id WHERE d.id = ?",
        [id],
        (err3, rows3) => {
          if (err3) return res.status(500).json(err3);

          const username = req.cookies?.username || req.headers["x-username"];
          if (username) {
            getUserIdFromUsername(username, (err4, userData) => {
              if (!err4 && userData) {
                logRiwayat(
                  "dipinjam_edit",
                  userData.id,
                  userData.role,
                  old.aset_id,
                  changes,
                  "dipinjam",
                  id
                );
              }
            });
          }

          res.json({
            message: "Data peminjaman diperbarui",
            dipinjam: mapRow(rows3[0]),
          });
        }
      );
    });
  });
});

// DELETE (admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM dipinjam WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res
        .status(404)
        .json({ message: "Data peminjaman tidak ditemukan" });

    const record = rows[0];

    db.query("DELETE FROM dipinjam WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json(err2);

      const username = req.cookies?.username || req.headers["x-username"];
      if (username) {
        getUserIdFromUsername(username, (err3, userData) => {
          if (!err3 && userData) {
            logRiwayat(
              "dipinjam_delete",
              userData.id,
              userData.role,
              record.aset_id,
              null,
              "dipinjam",
              id
            );
          }
        });
      }

      res.json({ message: "Data peminjaman dihapus" });
    });
  });
});

export default router;
