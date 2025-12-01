import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanFromRequest,
} from "./middleware/auth.js";
import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
// Multer setup for uploads
const imgsDir = path.join(process.cwd(), "assets", "imgs");
if (!fs.existsSync(imgsDir)) fs.mkdirSync(imgsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imgsDir);
  },
  filename: function (req, file, cb) {
    // sanitize and make unique
    const ts = Date.now();
    const safeName = file.originalname.replace(/[^a-z0-9\.\-\_]/gi, "_");
    cb(null, `${ts}-${safeName}`);
  },
});
const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Not an image"), false);
  }
  cb(null, true);
};
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Map DB row to expected JSON format
function mapRow(row) {
  if (!row) return row;
  return {
    id: row.id ?? row.Id ?? null,
    AsetId: row.AsetId ?? row.asetId ?? null,
    AccurateId: row.AccurateId ?? null,
    NamaAset: row.NamaAset ?? null,
    Spesifikasi: row.Spesifikasi ?? null,
    Grup: row.Grup ?? null,
    Beban: row.Beban ?? null,
    AkunPerkiraan: row.AkunPerkiraan ?? row.Akun_Perkiraan ?? null,
    NilaiAset: row.NilaiAset ?? null,
    TglPembelian: row.TglPembelian ?? null,
    MasaManfaat: row.MasaManfaat ?? null,
    StatusAset: row.StatusAset ?? row.Status ?? null,
    // Prefer Keterangan; fallback to old Kekurangan column if present for compatibility
    Keterangan: row.Keterangan ?? row.Kekurangan ?? null,
    // Deprecated: Kekurangan column removed; use Keterangan instead
    Gambar: row.Gambar ?? null,
  };
}

router.use((req, res, next) => {
  const role = getRoleFromRequest(req) || "(none)";
  const beban = getBebanFromRequest(req) || "(none)";
  console.log(
    `[aset] ${req.method} ${req.originalUrl} - role=${role} beban=${beban}`
  );
  next();
});

router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    const q = "SELECT * FROM aset";
    db.query(q, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result.map(mapRow));
    });
    return;
  }
  const beban = getBebanFromRequest(req);
  if (!beban || beban === "") {
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  }
  const q = "SELECT * FROM aset WHERE Beban = ?";
  db.query(q, [beban], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result.map(mapRow));
  });
});

router.post("/", requireUserOrAdmin, upload.single("Gambar"), (req, res) => {
  // support multipart/form-data file upload (field Gambar) or JSON body
  const data = req.body;
  // Prefer filename from multer if present (req.file.filename), otherwise allow caller to pass a filename
  let fileName = null;
  if (req.file) {
    fileName = `/assets/imgs/${req.file.filename}`;
  } else if (data.Gambar) {
    // Use provided value; accept full path or just filename
    fileName = data.Gambar.startsWith("/")
      ? data.Gambar
      : `/assets/imgs/${data.Gambar}`;
  }
  if (req.file) {
    console.log(
      `[aset] uploaded file: ${req.file.originalname} -> ${req.file.filename}`
    );
    try {
      console.log(`[aset] req.file: ${JSON.stringify(req.file)}`);
    } catch (e) {}
  }
  try {
    console.log(
      `[aset] request headers: ${JSON.stringify({
        "x-role": req.headers["x-role"],
        cookie: req.headers["cookie"],
      })}`
    );
  } catch (e) {}
  console.log(
    `[aset] insert values (AsetId, NamaAset, Beban, Gambar): ${data.AsetId},${data.NamaAset},${data.Beban},${fileName}`
  );
  const q = `
    INSERT INTO aset 
    (AsetId, AccurateId, NamaAset, Spesifikasi, Grup, Beban, AkunPerkiraan, NilaiAset, TglPembelian, MasaManfaat, Gambar, Keterangan, StatusAset)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.AsetId,
    data.AccurateId,
    data.NamaAset,
    data.Spesifikasi,
    data.Grup,
    data.Beban,
    data.AkunPerkiraan,
    data.NilaiAset,
    data.TglPembelian,
    data.MasaManfaat,
    fileName,
    data.Keterangan ?? null,
    data.StatusAset ?? null,
  ];
  try {
    console.log(`[aset] full values: ${JSON.stringify(values)}`);
  } catch (e) {}

  db.query(q, values, (err, result) => {
    if (err) {
      console.error("Error inserting aset:", err);
      return res.status(500).json(err);
    }
    console.log(`[aset] insertId: ${result.insertId}`);
    // Return the created asset for verification using insertId to avoid duplicates
    db.query(
      "SELECT * FROM aset WHERE id = ?",
      [result.insertId],
      (err2, rows2) => {
        if (err2) return res.status(500).json(err2);
        if (!rows2 || rows2.length === 0)
          return res
            .status(201)
            .json({ message: "Aset ditambahkan, namun tidak dapat diambil" });
        res.status(201).json({
          message: "Aset berhasil ditambahkan",
          asset: mapRow(rows2[0]),
        });
      }
    );
  });
});

router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const q = "SELECT * FROM aset WHERE AsetId = ?";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result || result.length === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    // Debugging: print Keterangan/Kekurangan fields to confirm where value is stored
    try {
      console.log(
        `[aset] DB fields for AsetId=${id} Keterangan=`,
        result[0].Keterangan,
        " Kekurangan=",
        result[0].Kekurangan
      );
    } catch (e) {}
    const asset = mapRow(result[0]);
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(asset);
    const beban = getBebanFromRequest(req);
    if (!beban || beban === "") {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    if ((asset.Beban ?? "") !== beban) {
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    }
    res.json(asset);
  });
});

router.put("/:id", requireAdmin, upload.single("Gambar"), (req, res) => {
  const { id } = req.params;
  const data = req.body;
  if (req.file) {
    data.Gambar = `/assets/imgs/${req.file.filename}`;
  }

  const qSelect = "SELECT * FROM aset WHERE AsetId = ?";
  db.query(qSelect, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    }

    const current = rows[0];
    const oldGambar = current.Gambar ?? null;
    const values = [
      data.AccurateId,
      data.NamaAset,
      data.Spesifikasi,
      data.Grup,
      data.Beban,
      data.AkunPerkiraan,
      data.NilaiAset,
      data.TglPembelian,
      data.MasaManfaat,
      data.StatusAset,
      data.Keterangan,
      data.Gambar ?? null,
      id,
    ];

    const q = `UPDATE aset SET AccurateId = COALESCE(?, AccurateId), NamaAset = COALESCE(?, NamaAset), Spesifikasi = COALESCE(?, Spesifikasi), Grup = COALESCE(?, Grup), Beban = COALESCE(?, Beban), AkunPerkiraan = COALESCE(?, AkunPerkiraan), NilaiAset = COALESCE(?, NilaiAset), TglPembelian = COALESCE(?, TglPembelian), MasaManfaat = COALESCE(?, MasaManfaat), StatusAset = COALESCE(?, StatusAset), Keterangan = COALESCE(?, Keterangan), Gambar = COALESCE(?, Gambar) WHERE AsetId = ?`;
    try {
      console.log(`[aset] PUT req.body: ${JSON.stringify(data)}`);
      console.log(
        `[aset] PUT Keterangan type: ${typeof data.Keterangan} value: ${JSON.stringify(
          data.Keterangan
        )}`
      );
      console.log(`[aset] UPDATE SQL: ${q} values=${JSON.stringify(values)}`);
    } catch (e) {}

    db.query(q, values, (err2, result) => {
      if (err2) return res.status(500).json(err2);
      console.log(
        `[aset] update result: affectedRows=${
          result.affectedRows
        } changedRows=${result.changedRows ?? "n/a"}`
      );
      if (result.affectedRows === 0) {
        return res.json({ message: "Tidak ada perubahan (data sama)" });
      }
      // If we uploaded a new file, delete old file (oldGambar may store full path)
      if (req.file && oldGambar) {
        const oldBasename = path.basename(oldGambar);
        try {
          fs.unlinkSync(path.join(imgsDir, oldBasename));
        } catch (e) {}
      }
      // Log raw fields returned by DB after update to verify Keterangan/Kekurangan
      db.query(
        "SELECT Keterangan, Kekurangan FROM aset WHERE AsetId = ?",
        [id],
        (errCheck, rowsCheck) => {
          if (!errCheck && rowsCheck && rowsCheck.length > 0) {
            try {
              console.log(
                `[aset] post-update DB Keterangan=`,
                rowsCheck[0].Keterangan,
                " Kekurangan=",
                rowsCheck[0].Kekurangan
              );
            } catch (e) {}
          }
        }
      );
      // Return updated row
      db.query("SELECT * FROM aset WHERE AsetId = ?", [id], (err3, rows2) => {
        if (err3) return res.status(500).json(err3);
        if (!rows2 || rows2.length === 0)
          return res
            .status(404)
            .json({ message: "Aset tidak ditemukan setelah update" });
        res.json({
          message: "Aset berhasil diupdate",
          updated: mapRow(rows2[0]),
        });
      });
    });
  });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const role = getRoleFromRequest(req);
  console.log(`[aset] DELETE handler invoked for AsetId=${id} role=${role}`);
  const q = "DELETE FROM aset WHERE AsetId = ?";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    res.json({ message: "Aset berhasil dihapus" });
  });
});

// Upload or replace image for an asset (admin only)
router.put("/:id/gambar", requireAdmin, upload.single("Gambar"), (req, res) => {
  const { id } = req.params;
  if (!req.file)
    return res.status(400).json({ message: "File tidak disertakan" });
  const newFilename = req.file.filename; // filename on disk
  const newGambarPath = `/assets/imgs/${newFilename}`; // full path to store in DB
  // find existing asset to delete old image if any
  const qSelect = "SELECT * FROM aset WHERE AsetId = ?";
  db.query(qSelect, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      // delete uploaded file since asset not found
      try {
        fs.unlinkSync(path.join(imgsDir, newFilename));
      } catch (e) {}
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    }
    const current = rows[0];
    const oldFilename = current.Gambar ?? null;
    const qUpdate = "UPDATE aset SET Gambar = ? WHERE AsetId = ?";
    db.query(qUpdate, [newGambarPath, id], (err2) => {
      if (err2) return res.status(500).json(err2);
      // delete old file if present
      if (oldFilename) {
        const oldBasename = path.basename(oldFilename);
        try {
          fs.unlinkSync(path.join(imgsDir, oldBasename));
        } catch (e) {}
      }
      db.query("SELECT * FROM aset WHERE AsetId = ?", [id], (err3, rows2) => {
        if (err3) return res.status(500).json(err3);
        if (!rows2 || rows2.length === 0)
          return res
            .status(404)
            .json({ message: "Aset tidak ditemukan setelah update" });
        res.json({
          message: "Gambar aset berhasil diupload",
          updated: mapRow(rows2[0]),
        });
      });
    });
  });
});

// Update only Keterangan (admin only) - simple endpoint for quick edits
router.put("/:id/keterangan", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  if (!data || typeof data.Keterangan === "undefined") {
    return res.status(400).json({ message: "Keterangan is required in body" });
  }
  try {
    console.log("[aset] /:id/keterangan payload", JSON.stringify(data));
  } catch (e) {}
  const q = "UPDATE aset SET Keterangan = ? WHERE AsetId = ?";
  db.query(q, [data.Keterangan ?? null, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    db.query("SELECT * FROM aset WHERE AsetId = ?", [id], (err2, rows2) => {
      if (err2) return res.status(500).json(err2);
      res.json({
        message: "Keterangan berhasil diupdate",
        updated: mapRow(rows2[0]),
      });
    });
  });
});

export default router;
