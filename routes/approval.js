import express from "express";
import db from "../db.js";
import { requireAdmin, getRoleFromRequest } from "./middleware/auth.js";
import {
  updateApprovalStatus,
  logApprovalAction,
  notifySubmitterOfDecision,
  getPendingApprovals,
} from "./middleware/approval.js";

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

// GET pending approvals (admin only)
router.get("/pending", requireAdmin, (req, res) => {
  getPendingApprovals(null, (err, approvals) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      total: approvals.length,
      approvals: approvals,
    });
  });
});

// GET details of specific record for approval
router.get("/:tabelRef/:recordId", requireAdmin, (req, res) => {
  const { tabelRef, recordId } = req.params;

  const validTables = [
    "aset",
    "perbaikan",
    "rusak",
    "dipinjam",
    "dijual",
    "mutasi",
  ];

  if (!validTables.includes(tabelRef)) {
    return res.status(400).json({ message: "Tabel tidak valid" });
  }

  let query = "";
  switch (tabelRef) {
    case "aset":
      query = `
        SELECT a.*, 
          b.kode as beban_kode, 
          d.kode as departemen_kode, d.nama as departemen_nama,
          u.username as created_by
        FROM aset a 
        LEFT JOIN beban b ON a.beban_id = b.id
        LEFT JOIN departemen d ON a.departemen_id = d.id
        LEFT JOIN riwayat r ON r.aset_id = a.id AND r.tabel_ref = 'aset' AND r.jenis_aksi = 'input'
        LEFT JOIN user u ON r.user_id = u.id
        WHERE a.id = ?
      `;
      break;
    case "perbaikan":
      query = `
        SELECT p.*, 
          a.AsetId, a.NamaAset, 
          b.kode as beban_kode,
          u.username as created_by
        FROM perbaikan p 
        LEFT JOIN aset a ON p.aset_id = a.id
        LEFT JOIN beban b ON a.beban_id = b.id
        LEFT JOIN riwayat r ON r.record_id = p.id AND r.tabel_ref = 'perbaikan' AND r.jenis_aksi LIKE '%input%'
        LEFT JOIN user u ON r.user_id = u.id
        WHERE p.id = ?
      `;
      break;
    case "rusak":
      query = `
        SELECT r.*, 
          a.AsetId, a.NamaAset, 
          b.kode as beban_kode,
          u.username as created_by
        FROM rusak r 
        LEFT JOIN aset a ON r.aset_id = a.id
        LEFT JOIN beban b ON a.beban_id = b.id
        LEFT JOIN riwayat rw ON rw.record_id = r.id AND rw.tabel_ref = 'rusak' AND rw.jenis_aksi LIKE '%input%'
        LEFT JOIN user u ON rw.user_id = u.id
        WHERE r.id = ?
      `;
      break;
    case "dipinjam":
      query = `
        SELECT d.*, 
          a.AsetId, a.NamaAset, 
          b.kode as beban_kode,
          u.username as created_by
        FROM dipinjam d 
        LEFT JOIN aset a ON d.aset_id = a.id
        LEFT JOIN beban b ON a.beban_id = b.id
        LEFT JOIN riwayat r ON r.record_id = d.id AND r.tabel_ref = 'dipinjam' AND r.jenis_aksi LIKE '%input%'
        LEFT JOIN user u ON r.user_id = u.id
        WHERE d.id = ?
      `;
      break;
    case "dijual":
      query = `
        SELECT dj.*, 
          a.AsetId, a.NamaAset, 
          b.kode as beban_kode,
          u.username as created_by
        FROM dijual dj 
        LEFT JOIN aset a ON dj.aset_id = a.id
        LEFT JOIN beban b ON a.beban_id = b.id
        LEFT JOIN riwayat r ON r.record_id = dj.id AND r.tabel_ref = 'dijual' AND r.jenis_aksi LIKE '%input%'
        LEFT JOIN user u ON r.user_id = u.id
        WHERE dj.id = ?
      `;
      break;
    case "mutasi":
      query = `
        SELECT m.*, 
          a.AsetId, a.NamaAset, 
          b.kode as beban_kode,
          da.nama as departemen_asal_nama,
          dt.nama as departemen_tujuan_nama,
          u.username as created_by
        FROM mutasi m 
        LEFT JOIN aset a ON m.aset_id = a.id
        LEFT JOIN beban b ON a.beban_id = b.id
        LEFT JOIN departemen da ON m.departemen_asal_id = da.id
        LEFT JOIN departemen dt ON m.departemen_tujuan_id = dt.id
        LEFT JOIN riwayat r ON r.record_id = m.id AND r.tabel_ref = 'mutasi' AND r.jenis_aksi LIKE '%input%'
        LEFT JOIN user u ON r.user_id = u.id
        WHERE m.id = ?
      `;
      break;
  }

  db.query(query, [recordId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json({
      tabel_ref: tabelRef,
      record: rows[0],
    });
  });
});

// POST approve or reject
router.post("/:tabelRef/:recordId/:action", requireAdmin, (req, res) => {
  const { tabelRef, recordId, action } = req.params;
  const { alasan } = req.body;

  const validTables = [
    "aset",
    "perbaikan",
    "rusak",
    "dipinjam",
    "dijual",
    "mutasi",
  ];

  if (!validTables.includes(tabelRef)) {
    return res.status(400).json({ message: "Tabel tidak valid" });
  }

  if (action !== "approve" && action !== "reject") {
    return res
      .status(400)
      .json({ message: "Aksi harus 'approve' atau 'reject'" });
  }

  const status = action === "approve" ? "disetujui" : "ditolak";
  const username = req.cookies?.username || req.headers["x-username"];

  if (!username) {
    return res.status(401).json({ message: "Username tidak ditemukan" });
  }

  // First, get the record details
  let getRecordQuery = "";
  switch (tabelRef) {
    case "aset":
      getRecordQuery = `SELECT a.id, a.AsetId, a.beban_id, b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.id = ?`;
      break;
    default:
      getRecordQuery = `SELECT t.id, t.aset_id, a.AsetId, a.beban_id, b.kode as beban_kode FROM ${tabelRef} t LEFT JOIN aset a ON t.aset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE t.id = ?`;
      break;
  }

  db.query(getRecordQuery, [recordId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const record = rows[0];
    const asetDbId = tabelRef === "aset" ? record.id : record.aset_id;
    const asetId = record.AsetId;
    const beban = record.beban_kode;

    // Get submitter info from riwayat
    const getRiwayatQuery = `
      SELECT user_id FROM riwayat 
      WHERE tabel_ref = ? AND record_id = ? AND jenis_aksi LIKE '%input%'
      ORDER BY created_at DESC LIMIT 1
    `;

    db.query(getRiwayatQuery, [tabelRef, recordId], (err2, riwayatRows) => {
      const submitterId =
        riwayatRows && riwayatRows.length > 0 ? riwayatRows[0].user_id : null;

      // Get admin user info first so we can persist approver info into the table
      getUserIdFromUsername(username, (err4, adminUser) => {
        if (err4) {
          console.error("[approval] Error getting admin user:", err4);
          return res.status(500).json({ error: err4.message });
        }

        // Update approval status and approver columns
        updateApprovalStatus(
          tabelRef,
          recordId,
          status,
          adminUser.id,
          username,
          adminUser.role,
          alasan,
          (err3) => {
            if (err3) {
              return res.status(500).json({ error: err3.message });
            }

            // Try to merge approval into the original 'input' riwayat entry if present
            const qFind = `SELECT id, perubahan FROM riwayat WHERE ((tabel_ref = ? AND record_id = ?) OR (aset_id = ?)) AND jenis_aksi LIKE '%input%' ORDER BY created_at DESC LIMIT 1`;
            db.query(
              qFind,
              [tabelRef, recordId, asetDbId],
              (errFind, findRows) => {
                if (errFind) {
                  console.error(
                    "[approval] Error finding input riwayat to merge:",
                    errFind
                  );
                  // fallback to normal logging
                  logApprovalAction(
                    status,
                    adminUser.id,
                    adminUser.role,
                    asetDbId,
                    tabelRef,
                    recordId,
                    alasan,
                    username
                  );
                } else if (findRows && findRows.length > 0) {
                  const r = findRows[0];
                  let perubahanObj = null;
                  try {
                    perubahanObj = r.perubahan
                      ? typeof r.perubahan === "string"
                        ? JSON.parse(r.perubahan)
                        : r.perubahan
                      : {};
                  } catch (e) {
                    perubahanObj = { original_perubahan: r.perubahan };
                  }
                  if (!perubahanObj.approvals) perubahanObj.approvals = [];
                  perubahanObj.approvals.push({
                    approval_action: status,
                    oleh_user_id: adminUser.id,
                    oleh_username: username,
                    oleh_role: adminUser.role,
                    alasan: alasan,
                    timestamp: new Date().toISOString(),
                  });

                  const qUpdate = `UPDATE riwayat SET perubahan = ? WHERE id = ?`;
                  db.query(
                    qUpdate,
                    [JSON.stringify(perubahanObj), r.id],
                    (errUpd) => {
                      if (errUpd) {
                        console.error(
                          "[approval] Error merging approval into riwayat:",
                          errUpd
                        );
                        // fallback to normal logging
                        logApprovalAction(
                          status,
                          adminUser.id,
                          adminUser.role,
                          asetDbId,
                          tabelRef,
                          recordId,
                          alasan,
                          username
                        );
                      } else {
                        console.log(
                          `[approval] Merged approval ${status} into riwayat#${r.id}`
                        );
                      }
                    }
                  );
                } else {
                  // No input row found — try to find any riwayat for this record and merge
                  const qAny = `SELECT id, perubahan FROM riwayat WHERE ((tabel_ref = ? AND record_id = ?) OR (aset_id = ?)) ORDER BY created_at DESC LIMIT 1`;
                  db.query(
                    qAny,
                    [tabelRef, recordId, asetDbId],
                    (errAny, anyRows) => {
                      if (errAny) {
                        console.error(
                          "[approval] Error finding any riwayat to merge:",
                          errAny
                        );
                        logApprovalAction(
                          status,
                          adminUser.id,
                          adminUser.role,
                          asetDbId,
                          tabelRef,
                          recordId,
                          alasan,
                          username
                        );
                        return;
                      }

                      if (anyRows && anyRows.length > 0) {
                        const r2 = anyRows[0];
                        let perubahanObj = null;
                        try {
                          perubahanObj = r2.perubahan
                            ? typeof r2.perubahan === "string"
                              ? JSON.parse(r2.perubahan)
                              : r2.perubahan
                            : {};
                        } catch (e) {
                          perubahanObj = { original_perubahan: r2.perubahan };
                        }
                        if (!perubahanObj.approvals)
                          perubahanObj.approvals = [];
                        perubahanObj.approvals.push({
                          approval_action: status,
                          oleh_user_id: adminUser.id,
                          oleh_username: username,
                          oleh_role: adminUser.role,
                          alasan: alasan,
                          timestamp: new Date().toISOString(),
                        });

                        const qUpdateAny = `UPDATE riwayat SET perubahan = ? WHERE id = ?`;
                        db.query(
                          qUpdateAny,
                          [JSON.stringify(perubahanObj), r2.id],
                          (errUpdAny) => {
                            if (errUpdAny) {
                              console.error(
                                "[approval] Error merging approval into riwayat (anyRow):",
                                errUpdAny
                              );
                              logApprovalAction(
                                status,
                                adminUser.id,
                                adminUser.role,
                                asetDbId,
                                tabelRef,
                                recordId,
                                alasan,
                                username
                              );
                            } else {
                              console.log(
                                `[approval] Merged approval ${status} into riwayat#${r2.id} (anyRow)`
                              );
                            }
                          }
                        );
                      } else {
                        // No riwayat at all — fallback to insert
                        logApprovalAction(
                          status,
                          adminUser.id,
                          adminUser.role,
                          asetDbId,
                          tabelRef,
                          recordId,
                          alasan,
                          username
                        );
                      }
                    }
                  );
                }
              }
            );

            // Notify submitter (include approver id/username/role)
            if (submitterId) {
              notifySubmitterOfDecision(
                submitterId,
                beban,
                status,
                tabelRef,
                recordId,
                asetId,
                alasan,
                adminUser.id,
                username,
                adminUser.role
              );
            }

            // If approved, update asset StatusAset according to the transaction type
            if (status === "disetujui") {
              let newStatus = null;
              switch (tabelRef) {
                case "rusak":
                  newStatus = "rusak";
                  break;
                case "perbaikan":
                  newStatus = "diperbaiki";
                  break;
                case "dipinjam":
                  newStatus = "dipinjam";
                  break;
                case "dijual":
                  newStatus = "dijual";
                  break;
                default:
                  newStatus = null;
              }

              if (newStatus) {
                // Update by aset id (numeric) when available
                db.query(
                  "UPDATE aset SET StatusAset = ? WHERE id = ?",
                  [newStatus, asetDbId],
                  (errA, rA) => {
                    if (errA) {
                      console.error(
                        `[approval] Error updating aset StatusAset for ${tabelRef}#${recordId}:`,
                        errA
                      );
                    } else {
                      console.log(
                        `[approval] Set aset#${asetDbId} StatusAset='${newStatus}' due to ${tabelRef}#${recordId} approval`
                      );
                    }
                  }
                );
              }
            }

            res.json({
              message: `Pengajuan ${tabelRef} berhasil ${status}`,
              tabel_ref: tabelRef,
              record_id: recordId,
              status: status,
              alasan: alasan || null,
            });
          }
        );
      });
    });
  });
});

export default router;
