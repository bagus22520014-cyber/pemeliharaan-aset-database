import express from "express";
import db from "../db.js";
import {
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
  isSameLocation,
} from "./middleware/auth.js";

const router = express.Router();

function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function mapRow(row) {
  if (!row) return row;
  return {
    id: row.id ?? null,
    AsetId: row.AsetId ?? null,
    AccurateId: row.AccurateId ?? null,
    NamaAset: row.NamaAset ?? null,
    Spesifikasi: row.Spesifikasi ?? null,
    Grup: row.Grup ?? null,
    beban_id: row.beban_id ?? null,
    beban: row.beban_kode
      ? { id: row.beban_id, kode: row.beban_kode, aktif: row.beban_aktif === 1 }
      : null,
    departemen_id: row.departemen_id ?? null,
    departemen: row.departemen_kode
      ? {
          id: row.departemen_id,
          kode: row.departemen_kode,
          nama: row.departemen_nama,
        }
      : null,
    AkunPerkiraan: row.AkunPerkiraan ?? null,
    NilaiAset: row.NilaiAset ?? null,
    TglPembelian: formatDate(row.TglPembelian),
    MasaManfaat: row.MasaManfaat ?? null,
    StatusAset: row.StatusAset ?? null,
    Pengguna: row.Pengguna ?? null,
    Lokasi: row.Lokasi ?? null,
    Keterangan: row.Keterangan ?? row.Kekurangan ?? null,
    Gambar: row.Gambar ?? null,
  };
}

router.use((req, res, next) => {
  const role = getRoleFromRequest(req) || "(none)";
  const beban = getBebanListFromRequest(req) || ["(none)"];
  console.log(
    `[aset_copy] ${req.method} ${req.originalUrl} - role=${role} beban=${beban}`
  );
  next();
});

// List aset_copy (read-only)
router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    const q = `
      SELECT a.*, b.id as beban_id, b.kode as beban_kode, b.aktif as beban_aktif,
        d.id as departemen_id, d.kode as departemen_kode, d.nama as departemen_nama
      FROM aset_copy a
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d ON a.departemen_id = d.id
    `;
    db.query(q, (err, rows) => {
      if (err) return res.status(500).json(err);
      return res.json(rows.map(mapRow));
    });
    return;
  }
  const bebanList = getBebanListFromRequest(req);
  if (!bebanList || bebanList.length === 0)
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  const placeholders = bebanList.map(() => "?").join(",");
  const qBebanIds = `SELECT id FROM beban WHERE kode IN (${placeholders})`;
  db.query(qBebanIds, bebanList, (errBeban, bebanRows) => {
    if (errBeban) return res.status(500).json(errBeban);
    const bebanIds = bebanRows.map((r) => r.id);
    if (bebanIds.length === 0)
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak valid" });
    const bebanPlaceholders = bebanIds.map(() => "?").join(",");
    const q = `
      SELECT a.*, b.id as beban_id, b.kode as beban_kode, b.aktif as beban_aktif,
        d.id as departemen_id, d.kode as departemen_kode, d.nama as departemen_nama
      FROM aset_copy a
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d ON a.departemen_id = d.id
      WHERE a.beban_id IN (${bebanPlaceholders})
    `;
    db.query(q, bebanIds, (err, rows) => {
      if (err) return res.status(500).json(err);
      return res.json(rows.map(mapRow));
    });
  });
});

// Get single aset_copy by AsetId
router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const q = `
    SELECT a.*, b.id as beban_id, b.kode as beban_kode, b.aktif as beban_aktif,
      d.id as departemen_id, d.kode as departemen_kode, d.nama as departemen_nama
    FROM aset_copy a
    LEFT JOIN beban b ON a.beban_id = b.id
    LEFT JOIN departemen d ON a.departemen_id = d.id
    WHERE a.AsetId = ?
  `;
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Aset copy tidak ditemukan" });
    const asset = mapRow(rows[0]);
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(asset);
    const bebanList = getBebanListFromRequest(req);
    if (!bebanList || bebanList.length === 0)
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    const assetBebanKode = asset.beban?.kode || "";
    if (!isSameLocation(assetBebanKode, bebanList))
      return res.status(404).json({ message: "Aset copy tidak ditemukan" });
    return res.json(asset);
  });
});

export default router;
