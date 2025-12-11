import db from "../../db.js";

/**
 * Helper functions for approval workflow
 */

// Create notification for admin
export function notifyAdminsForApproval(
  tabelRef,
  recordId,
  asetId,
  message,
  callback
) {
  // Get all admin users
  const qAdmins = `SELECT id FROM user WHERE role = 'admin'`;

  db.query(qAdmins, (err, admins) => {
    if (err) {
      console.error("[approval] Error fetching admins:", err);
      if (callback) callback(err);
      return;
    }

    if (!admins || admins.length === 0) {
      console.log("[approval] No admin users found");
      if (callback) callback(null);
      return;
    }

    let notified = 0;
    const total = admins.length;

    admins.forEach((admin) => {
      const fullMessage = `[Persetujuan Diperlukan] ${message}`;
      const qNotif = `
        INSERT INTO notification 
        (user_id, beban, type, message, AsetId, tabel_ref, record_id) 
        VALUES (?, NULL, 'approval', ?, ?, ?, ?)
      `;

      db.query(
        qNotif,
        [admin.id, fullMessage, asetId, tabelRef, recordId],
        (errNotif) => {
          notified++;
          if (errNotif) {
            console.error(
              `[approval] Error notifying admin ${admin.id}:`,
              errNotif
            );
          } else {
            console.log(`[approval] Notified admin ${admin.id}`);
          }

          if (notified === total && callback) {
            callback(null, notified);
          }
        }
      );
    });
  });
}

// Get approval status based on role
export function getApprovalStatus(role) {
  return role === "admin" ? "disetujui" : "diajukan";
}

// Log approval action to riwayat
export function logApprovalAction(
  action,
  userId,
  role,
  asetId,
  tabelRef,
  recordId,
  alasan = null,
  approverUsername = null,
  callback
) {
  // Try to merge approval info into the most recent riwayat entry for this record
  // Try to find latest riwayat by record_id first; if not present (e.g., aset input uses aset_id),
  // also allow matching by aset_id to merge approval into the original input riwayat.
  // Prefer the original 'input' riwayat entry for this record (if present).
  const qLatestInput = `SELECT id, perubahan FROM riwayat WHERE ((tabel_ref = ? AND record_id = ?) OR (aset_id = ?)) AND jenis_aksi LIKE '%input%' ORDER BY created_at DESC LIMIT 1`;
  db.query(qLatestInput, [tabelRef, recordId, asetId], (err, rows) => {
    if (err) {
      console.error("[approval] Error fetching latest riwayat:", err);
      // fallback to inserting a new riwayat row
      insertApprovalRow();
      return;
    }

    if (rows && rows.length > 0) {
      const row = rows[0];
      let perubahanObj = null;
      try {
        perubahanObj = row.perubahan
          ? typeof row.perubahan === "string"
            ? JSON.parse(row.perubahan)
            : row.perubahan
          : {};
      } catch (e) {
        perubahanObj = { original_perubahan: row.perubahan };
      }

      // Append approval history into perubahanObj.approvals (array)
      if (!perubahanObj.approvals) perubahanObj.approvals = [];
      perubahanObj.approvals.push({
        approval_action: action,
        oleh_user_id: userId,
        oleh_username: approverUsername || null,
        oleh_role: role,
        alasan: alasan,
        timestamp: new Date().toISOString(),
      });

      const qUpdate = `UPDATE riwayat SET perubahan = ? WHERE id = ?`;
      db.query(qUpdate, [JSON.stringify(perubahanObj), row.id], (errUpd) => {
        if (errUpd) {
          console.error(
            "[approval] Error updating riwayat with approval:",
            errUpd
          );
          // fallback to inserting a new riwayat row
          insertApprovalRow();
          return;
        }
        console.log(
          `[approval] Merged approval ${action} into riwayat#${row.id} for ${tabelRef}#${recordId}`
        );
        if (callback) callback(null);
      });
    } else {
      // No input-type riwayat found — try to find any riwayat for this record to merge into
      const qAny = `SELECT id, perubahan FROM riwayat WHERE ((tabel_ref = ? AND record_id = ?) OR (aset_id = ?)) ORDER BY created_at DESC LIMIT 1`;
      db.query(qAny, [tabelRef, recordId, asetId], (errAny, anyRows) => {
        if (errAny) {
          console.error(
            "[approval] Error fetching any riwayat to merge:",
            errAny
          );
          insertApprovalRow();
          return;
        }

        if (anyRows && anyRows.length > 0) {
          const row = anyRows[0];
          let perubahanObj = null;
          try {
            perubahanObj = row.perubahan
              ? typeof row.perubahan === "string"
                ? JSON.parse(row.perubahan)
                : row.perubahan
              : {};
          } catch (e) {
            perubahanObj = { original_perubahan: row.perubahan };
          }

          if (!perubahanObj.approvals) perubahanObj.approvals = [];
          perubahanObj.approvals.push({
            approval_action: action,
            oleh_user_id: userId,
            oleh_username: approverUsername || null,
            oleh_role: role,
            alasan: alasan,
            timestamp: new Date().toISOString(),
          });

          const qUpdate = `UPDATE riwayat SET perubahan = ? WHERE id = ?`;
          db.query(
            qUpdate,
            [JSON.stringify(perubahanObj), row.id],
            (errUpd) => {
              if (errUpd) {
                console.error(
                  "[approval] Error updating riwayat with approval (anyRow):",
                  errUpd
                );
                insertApprovalRow();
                return;
              }
              console.log(
                `[approval] Merged approval ${action} into riwayat#${row.id} (anyRow match) for ${tabelRef}#${recordId}`
              );
              if (callback) callback(null);
            }
          );
        } else {
          // No previous riwayat found — insert new row
          insertApprovalRow();
        }
      });
    }
  });

  // Helper to insert a new riwayat row if merging fails or no previous entry
  function insertApprovalRow() {
    const q = `INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const perubahan = {
      approvals: [
        {
          approval_action: action,
          oleh_user_id: userId,
          oleh_username: approverUsername || null,
          oleh_role: role,
          alasan: alasan,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    db.query(
      q,
      [
        `approval_${action}`,
        userId,
        role,
        asetId,
        JSON.stringify(perubahan),
        tabelRef,
        recordId,
      ],
      (err) => {
        if (err) {
          console.error("[approval] Error inserting approval riwayat:", err);
        } else {
          console.log(
            `[approval] Inserted approval riwayat for ${tabelRef}#${recordId} by user ${userId}`
          );
        }
        if (callback) callback(err);
      }
    );
  }
}

// Update approval status in a table
export function updateApprovalStatus(
  tabelRef,
  recordId,
  status,
  approverUserId = null,
  approverUsername = null,
  approverRole = null,
  alasan = null,
  callback
) {
  const validTables = [
    "aset",
    "perbaikan",
    "rusak",
    "dipinjam",
    "dijual",
    "mutasi",
  ];
  if (!validTables.includes(tabelRef)) {
    return callback(new Error(`Invalid tabel_ref: ${tabelRef}`));
  }

  const q = `
    UPDATE ${tabelRef} 
    SET approval_status = ?, approval_date = CURRENT_TIMESTAMP,
        approval_by_user_id = ?, approval_by_username = ?, approval_by_role = ?
    WHERE id = ?
  `;

  db.query(
    q,
    [status, approverUserId, approverUsername, approverRole, recordId],
    (err, result) => {
      if (err) {
        console.error(
          `[approval] Error updating ${tabelRef}#${recordId}:`,
          err
        );
        return callback(err);
      }

      if (result.affectedRows === 0) {
        return callback(new Error("Record not found"));
      }

      console.log(
        `[approval] Updated ${tabelRef}#${recordId} to ${status} by ${approverUsername} (${approverUserId})`
      );
      callback(null, result);
    }
  );
}

// Notify submitter about approval decision
export function notifySubmitterOfDecision(
  userId,
  beban,
  status,
  tabelRef,
  recordId,
  asetId,
  alasan = null,
  approverUserId = null,
  approverUsername = null,
  approverRole = null,
  callback
) {
  const isApproved = status === "disetujui";
  const title = isApproved ? "Pengajuan Disetujui" : "Pengajuan Ditolak";
  const type = isApproved ? "success" : "error";

  let message = `[${title}] Pengajuan ${tabelRef} untuk aset ${asetId} telah ${status}`;
  if (approverUsername) {
    message += ` oleh ${approverUsername}`;
  }
  if (alasan) {
    message += `. Alasan: ${alasan}`;
  }

  const qNotif = `
    INSERT INTO notification 
    (user_id, beban, type, message, AsetId, tabel_ref, record_id, approver_user_id, approver_username, approver_role) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    qNotif,
    [
      userId,
      beban,
      type,
      message,
      asetId,
      tabelRef,
      recordId,
      approverUserId,
      approverUsername,
      approverRole,
    ],
    (err) => {
      if (err) {
        console.error("[approval] Error notifying submitter:", err);
      } else {
        console.log(`[approval] Notified user ${userId} of ${status}`);
      }
      if (callback) callback(err);
    }
  );
}

// Get pending approvals (admin only)
export function getPendingApprovals(bebanFilter = null, callback) {
  // Build a UNION ALL query with a consistent column set across tables
  // columns: tabel_ref, id, aset_id, approval_status, approval_date
  const queries = [];
  // aset
  queries.push(
    `SELECT 'aset' AS tabel_ref, a.id AS id, a.id AS aset_id, a.approval_status, a.approval_date FROM aset a WHERE a.approval_status = 'diajukan'`
  );

  // perbaikan
  queries.push(
    `SELECT 'perbaikan' AS tabel_ref, p.id AS id, p.aset_id AS aset_id, p.approval_status, p.approval_date FROM perbaikan p WHERE p.approval_status = 'diajukan'`
  );

  // rusak
  queries.push(
    `SELECT 'rusak' AS tabel_ref, r.id AS id, r.aset_id AS aset_id, r.approval_status, r.approval_date FROM rusak r WHERE r.approval_status = 'diajukan'`
  );

  // dipinjam
  queries.push(
    `SELECT 'dipinjam' AS tabel_ref, d.id AS id, d.aset_id AS aset_id, d.approval_status, d.approval_date FROM dipinjam d WHERE d.approval_status = 'diajukan'`
  );

  // dijual
  queries.push(
    `SELECT 'dijual' AS tabel_ref, dj.id AS id, dj.aset_id AS aset_id, dj.approval_status, dj.approval_date FROM dijual dj WHERE dj.approval_status = 'diajukan'`
  );

  // mutasi
  queries.push(
    `SELECT 'mutasi' AS tabel_ref, m.id AS id, m.aset_id AS aset_id, m.approval_status, m.approval_date FROM mutasi m WHERE m.approval_status = 'diajukan'`
  );

  // Execute each query separately to avoid collation issues with UNION
  const results = [];
  let idx = 0;

  function runNext() {
    if (idx >= queries.length) {
      return callback(null, results);
    }
    const q = queries[idx++];
    db.query(q, (err, rows) => {
      if (err) {
        console.error(
          "[approval] Error fetching pending approvals (subquery):",
          err
        );
        return callback(err);
      }
      if (rows && rows.length > 0) results.push(...rows);
      runNext();
    });
  }

  runNext();
}
