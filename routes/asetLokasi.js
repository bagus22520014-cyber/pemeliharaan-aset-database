import express from "express";
import db from "../db.js";
import {
  requireUserOrAdmin,
  requireAdmin,
  getRoleFromRequest,
  getBebanFromRequest,
} from "./middleware/auth.js";

const router = express.Router();

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

/**
 * Map database row to API response format
 */
function mapRow(row) {
  return {
    id: row.id,
    AsetId: row.AsetId,
    beban: row.beban || null,
    NamaAset: row.NamaAset || undefined,
    lokasi: row.lokasi,
    jumlah: row.jumlah,
    keterangan: row.keterangan || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /aset-lokasi
 * Get all location allocations (admin) or filtered by Beban (user)
 */
router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);

  let query = `
    SELECT al.*, a.NamaAset 
    FROM aset_lokasi al
    LEFT JOIN aset a ON al.AsetId = a.AsetId
    LEFT JOIN beban b ON a.beban_id = b.id
  `;

  const params = [];

  if (role !== "admin") {
    query += " WHERE b.kode = ?";
    params.push(beban);
  }

  query += " ORDER BY al.created_at DESC";

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

/**
 * GET /aset-lokasi/aset/:asetId
 * Get all location allocations for specific asset
 */
router.get("/aset/:asetId", requireUserOrAdmin, (req, res) => {
  const { asetId } = req.params;
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);

  let query = `
    SELECT al.*, a.NamaAset, a.jumlah as total_jumlah
    FROM aset_lokasi al
    LEFT JOIN aset a ON al.AsetId = a.AsetId
    LEFT JOIN beban b ON a.beban_id = b.id
    WHERE al.AsetId = ?
  `;

  const params = [asetId];

  if (role !== "admin") {
    query += " AND b.kode = ?";
    params.push(beban);
  }

  query += " ORDER BY al.lokasi ASC";

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json(err);

    const mapped = rows.map(mapRow);
    const totalAllocated = rows.reduce((sum, row) => sum + row.jumlah, 0);
    const totalAset = rows.length > 0 ? rows[0].total_jumlah : 0;

    res.json({
      AsetId: asetId,
      NamaAset: rows.length > 0 ? rows[0].NamaAset : null,
      total_aset: totalAset,
      total_allocated: totalAllocated,
      available: totalAset - totalAllocated,
      locations: mapped,
    });
  });
});

/**
 * GET /aset-lokasi/lokasi/:lokasi
 * Get all assets in a specific location
 */
router.get("/lokasi/:lokasi", requireUserOrAdmin, (req, res) => {
  const { lokasi } = req.params;
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);

  let query = `
    SELECT al.*, a.NamaAset, a.Grup, b.kode as beban_kode
    FROM aset_lokasi al
    LEFT JOIN aset a ON al.AsetId = a.AsetId
    LEFT JOIN beban b ON a.beban_id = b.id
    WHERE al.lokasi = ?
  `;

  const params = [lokasi];

  if (role !== "admin") {
    query += " AND b.kode = ?";
    params.push(beban);
  }

  query += " ORDER BY a.NamaAset ASC";

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

/**
 * POST /aset-lokasi
 * Create new location allocation
 * Body: { AsetId, lokasi, jumlah, keterangan }
 */
router.post("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);
  const username = req.cookies?.username || req.headers["x-username"];
  const data = req.body;

  if (!data.AsetId || !data.lokasi) {
    return res.status(400).json({
      error: "AsetId and lokasi are required",
    });
  }

  const jumlah = data.jumlah ? parseInt(data.jumlah) : 1;

  if (jumlah <= 0) {
    return res.status(400).json({
      error: "jumlah must be greater than 0",
    });
  }

  // Check if asset exists and user has access
  let checkQuery = `
    SELECT a.jumlah, a.beban_id, b.kode as beban_kode
    FROM aset a
    LEFT JOIN beban b ON a.beban_id = b.id
    WHERE a.AsetId = ?
  `;
  const checkParams = [data.AsetId];

  if (role !== "admin") {
    checkQuery += " AND b.kode = ?";
    checkParams.push(beban);
  }

  db.query(checkQuery, checkParams, (err, asetRows) => {
    if (err) return res.status(500).json(err);

    if (asetRows.length === 0) {
      return res.status(404).json({
        error: "Asset not found or access denied",
      });
    }

    const totalAset = asetRows[0].jumlah;

    // Check current allocations
    const sumQuery = `
      SELECT COALESCE(SUM(jumlah), 0) as allocated 
      FROM aset_lokasi 
      WHERE AsetId = ?
    `;

    db.query(sumQuery, [data.AsetId], (err2, sumRows) => {
      if (err2) return res.status(500).json(err2);

      const currentAllocated = parseInt(sumRows[0].allocated) || 0;
      const newTotal = currentAllocated + jumlah;

      if (newTotal > totalAset) {
        return res.status(400).json({
          error: "Allocation exceeds available quantity",
          total_aset: totalAset,
          current_allocated: currentAllocated,
          available: totalAset - currentAllocated,
          requested: jumlah,
        });
      }

      // Insert new allocation (include beban from aset via JOIN)
      const insertQuery = `
        INSERT INTO aset_lokasi (AsetId, beban, lokasi, jumlah, keterangan)
        SELECT ?, b.kode, ?, ?, ?
        FROM aset a
        LEFT JOIN beban b ON a.beban_id = b.id
        WHERE a.AsetId = ?
        LIMIT 1
      `;

      const insertParams = [
        data.AsetId,
        data.lokasi,
        jumlah,
        data.keterangan || null,
        data.AsetId,
      ];

      db.query(insertQuery, insertParams, (err3, result) => {
        if (err3) return res.status(500).json(err3);

        // Log to riwayat with user_id
        getUserIdFromUsername(username, (errUser, userInfo) => {
          if (!errUser && userInfo) {
            const riwayatQuery = `
              INSERT INTO riwayat (user_id, tipe_perubahan, tabel_terkait, id_terkait, data_perubahan)
              VALUES (?, 'lokasi_input', 'aset_lokasi', ?, ?)
            `;

            const riwayatData = JSON.stringify({
              AsetId: data.AsetId,
              lokasi: data.lokasi,
              jumlah: jumlah,
            });

            db.query(
              riwayatQuery,
              [userInfo.id, result.insertId, riwayatData],
              (errRiwayat) => {
                if (errRiwayat) {
                  console.error(
                    "[asetLokasi] Error logging to riwayat:",
                    errRiwayat
                  );
                }
              }
            );
          }
        });

        res.status(201).json({
          id: result.insertId,
          AsetId: data.AsetId,
          lokasi: data.lokasi,
          jumlah: jumlah,
          keterangan: data.keterangan || null,
          message: "Location allocation created successfully",
        });
      });
    });
  });
});

/**
 * PUT /aset-lokasi/:id
 * Update location allocation (change jumlah or keterangan)
 * Body: { jumlah, keterangan, lokasi }
 */
router.put("/:id", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);
  const username = req.cookies?.username || req.headers["x-username"];
  const { id } = req.params;
  const data = req.body;

  // Get current allocation
  let checkQuery = `
    SELECT al.*, a.jumlah as total_jumlah, b.kode as beban_kode
    FROM aset_lokasi al
    LEFT JOIN aset a ON al.AsetId = a.AsetId
    LEFT JOIN beban b ON a.beban_id = b.id
    WHERE al.id = ?
  `;

  const checkParams = [id];

  if (role !== "admin") {
    checkQuery += " AND b.kode = ?";
    checkParams.push(beban);
  }

  db.query(checkQuery, checkParams, (err, rows) => {
    if (err) return res.status(500).json(err);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Allocation not found or access denied",
      });
    }

    const current = rows[0];
    const newJumlah =
      data.jumlah !== undefined ? parseInt(data.jumlah) : current.jumlah;
    const newLokasi = data.lokasi || current.lokasi;
    const newKeterangan =
      data.keterangan !== undefined ? data.keterangan : current.keterangan;

    if (newJumlah <= 0) {
      return res.status(400).json({
        error:
          "jumlah must be greater than 0. Use DELETE to remove allocation.",
      });
    }

    // Check if new allocation is valid
    const sumQuery = `
      SELECT COALESCE(SUM(jumlah), 0) as allocated 
      FROM aset_lokasi 
      WHERE AsetId = ? AND id != ?
    `;

    db.query(sumQuery, [current.AsetId, id], (err2, sumRows) => {
      if (err2) return res.status(500).json(err2);

      const otherAllocations = parseInt(sumRows[0].allocated) || 0;
      const newTotal = otherAllocations + newJumlah;

      if (newTotal > current.total_jumlah) {
        return res.status(400).json({
          error: "Allocation exceeds available quantity",
          total_aset: current.total_jumlah,
          other_allocations: otherAllocations,
          available: current.total_jumlah - otherAllocations,
          requested: newJumlah,
        });
      }

      // Update allocation
      const updateQuery = `
        UPDATE aset_lokasi 
        SET lokasi = ?, jumlah = ?, keterangan = ?
        WHERE id = ?
      `;

      db.query(
        updateQuery,
        [newLokasi, newJumlah, newKeterangan, id],
        (err3, result) => {
          if (err3) return res.status(500).json(err3);

          // Log to riwayat
          getUserIdFromUsername(username, (errUser, userInfo) => {
            if (!errUser && userInfo) {
              const riwayatQuery = `
              INSERT INTO riwayat (user_id, tipe_perubahan, tabel_terkait, id_terkait, data_perubahan)
              VALUES (?, 'lokasi_update', 'aset_lokasi', ?, ?)
            `;

              const riwayatData = JSON.stringify({
                AsetId: current.AsetId,
                old: { lokasi: current.lokasi, jumlah: current.jumlah },
                new: { lokasi: newLokasi, jumlah: newJumlah },
              });

              db.query(
                riwayatQuery,
                [userInfo.id, id, riwayatData],
                (errRiwayat) => {
                  if (errRiwayat) {
                    console.error(
                      "[asetLokasi] Error logging to riwayat:",
                      errRiwayat
                    );
                  }
                }
              );
            }
          });

          res.json({
            id: parseInt(id),
            AsetId: current.AsetId,
            lokasi: newLokasi,
            jumlah: newJumlah,
            keterangan: newKeterangan,
            message: "Location allocation updated successfully",
          });
        }
      );
    });
  });
});

/**
 * DELETE /aset-lokasi/:id
 * Remove location allocation
 */
router.delete("/:id", requireAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);
  const username = req.cookies?.username || req.headers["x-username"];
  const { id } = req.params;

  // Get allocation info before deleting
  let checkQuery = `
    SELECT al.*, b.kode as beban_kode
    FROM aset_lokasi al
    LEFT JOIN aset a ON al.AsetId = a.AsetId
    LEFT JOIN beban b ON a.beban_id = b.id
    WHERE al.id = ?
  `;

  const checkParams = [id];

  if (role !== "admin") {
    checkQuery += " AND b.kode = ?";
    checkParams.push(beban);
  }

  db.query(checkQuery, checkParams, (err, rows) => {
    if (err) return res.status(500).json(err);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Allocation not found or access denied",
      });
    }

    const allocation = rows[0];

    // Delete allocation
    db.query("DELETE FROM aset_lokasi WHERE id = ?", [id], (err2, result) => {
      if (err2) return res.status(500).json(err2);

      // Log to riwayat
      getUserIdFromUsername(username, (errUser, userInfo) => {
        if (!errUser && userInfo) {
          const riwayatQuery = `
            INSERT INTO riwayat (user_id, tipe_perubahan, tabel_terkait, id_terkait, data_perubahan)
            VALUES (?, 'lokasi_delete', 'aset_lokasi', ?, ?)
          `;

          const riwayatData = JSON.stringify({
            AsetId: allocation.AsetId,
            lokasi: allocation.lokasi,
            jumlah: allocation.jumlah,
          });

          db.query(
            riwayatQuery,
            [userInfo.id, id, riwayatData],
            (errRiwayat) => {
              if (errRiwayat) {
                console.error(
                  "[asetLokasi] Error logging to riwayat:",
                  errRiwayat
                );
              }
            }
          );
        }
      });

      res.json({
        message: "Location allocation deleted successfully",
        deleted: {
          id: allocation.id,
          AsetId: allocation.AsetId,
          lokasi: allocation.lokasi,
          jumlah: allocation.jumlah,
        },
      });
    });
  });
});

export default router;
