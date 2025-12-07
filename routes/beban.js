import express from "express";
import db from "../db.js";
import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanFromRequest,
} from "./middleware/auth.js";

const router = express.Router();

/**
 * Map database row to API response format
 */
function mapRow(row) {
  return {
    id: row.id,
    kode: row.kode,
    aktif: row.aktif === 1 || row.aktif === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * GET /beban
 * Get all beban (filter by aktif if query param provided)
 */
router.get("/", requireUserOrAdmin, (req, res) => {
  const { aktif } = req.query;

  let query = "SELECT * FROM beban";
  const params = [];

  if (aktif !== undefined) {
    query += " WHERE aktif = ?";
    params.push(aktif === "true" || aktif === "1" ? 1 : 0);
  }

  query += " ORDER BY kode ASC";

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

/**
 * GET /beban/:id
 * Get single beban by id
 */
router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM beban WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Beban not found" });
    }
    res.json(mapRow(rows[0]));
  });
});

/**
 * GET /beban/kode/:kode
 * Get single beban by kode
 */
router.get("/kode/:kode", requireUserOrAdmin, (req, res) => {
  const { kode } = req.params;

  db.query("SELECT * FROM beban WHERE kode = ?", [kode], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Beban not found" });
    }
    res.json(mapRow(rows[0]));
  });
});

/**
 * POST /beban
 * Create new beban (admin only)
 * Body: { kode, nama, aktif }
 */
router.post("/", requireAdmin, (req, res) => {
  const data = req.body;

  if (!data.kode || !data.nama) {
    return res.status(400).json({
      error: "kode and nama are required",
    });
  }

  // Check if kode already exists
  db.query(
    "SELECT id FROM beban WHERE kode = ?",
    [data.kode],
    (err, existing) => {
      if (err) return res.status(500).json(err);
      if (existing && existing.length > 0) {
        return res.status(409).json({
          error: "Beban with this kode already exists",
        });
      }

      const aktif = data.aktif !== undefined ? (data.aktif ? 1 : 0) : 1;

      const insertQuery = `
      INSERT INTO beban (kode, nama, aktif)
      VALUES (?, ?, ?)
    `;

      db.query(insertQuery, [data.kode, data.nama, aktif], (err2, result) => {
        if (err2) return res.status(500).json(err2);

        res.status(201).json({
          id: result.insertId,
          kode: data.kode,
          nama: data.nama,
          aktif: aktif === 1,
          message: "Beban created successfully",
        });
      });
    }
  );
});

/**
 * PUT /beban/:id
 * Update beban (admin only)
 * Body: { kode, aktif }
 */
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;

  // Check if beban exists
  db.query("SELECT * FROM beban WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Beban not found" });
    }

    const current = rows[0];
    const newKode = data.kode || current.kode;
    const newAktif =
      data.aktif !== undefined ? (data.aktif ? 1 : 0) : current.aktif;
    data.aktif !== undefined ? (data.aktif ? 1 : 0) : current.aktif;

    // Check if new kode conflicts with another record
    if (newKode !== current.kode) {
      db.query(
        "SELECT id FROM beban WHERE kode = ? AND id != ?",
        [newKode, id],
        (err2, conflicts) => {
          if (err2) return res.status(500).json(err2);
          if (conflicts && conflicts.length > 0) {
            return res.status(409).json({
              error: "Beban with this kode already exists",
            });
          }

          updateBeban();
        }
      );
    } else {
      updateBeban();
    }

    function updateBeban() {
      const updateQuery = `
        UPDATE beban 
        SET kode = ?, aktif = ?
        WHERE id = ?
      `;

      db.query(updateQuery, [newKode, newAktif, id], (err3) => {
        if (err3) return res.status(500).json(err3);

        res.json({
          id: parseInt(id),
          kode: newKode,
          aktif: newAktif === 1,
          message: "Beban updated successfully",
        });
      });
    }
  });
});

/**
 * DELETE /beban/:id
 * Delete beban (admin only)
 * Note: Will fail if beban is referenced by aset (foreign key constraint)
 */
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  // Check if beban exists
  db.query("SELECT * FROM beban WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Beban not found" });
    }

    const beban = rows[0];

    // Check if beban is used in aset table
    db.query(
      "SELECT COUNT(*) as count FROM aset WHERE Beban = ?",
      [beban.kode],
      (err2, countRows) => {
        if (err2) return res.status(500).json(err2);

        const usageCount = countRows[0].count;
        if (usageCount > 0) {
          return res.status(409).json({
            error:
              "Cannot delete beban. It is used by " + usageCount + " asset(s)",
            usage_count: usageCount,
          });
        }

        // Safe to delete
        db.query("DELETE FROM beban WHERE id = ?", [id], (err3) => {
          if (err3) return res.status(500).json(err3);

          res.json({
            message: "Beban deleted successfully",
            deleted: {
              id: beban.id,
              kode: beban.kode,
            },
          });
        });
      }
    );
  });
});

export default router;
