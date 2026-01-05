import express from "express";
import db from "../db.js";
import { spawn } from "child_process";
import path from "path";
import {
  requireUserOrAdmin,
  requireAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
  buildBebanFilterSQL,
  isSameLocation,
} from "./middleware/auth.js";
import {
  rateLimiter,
  sanitizeBody,
  validateRuleInput,
  validateRuleUpdate,
  validateScheduleQuery,
  validateIdParam,
  validateScheduleUpdate,
  validateCompleteBody,
} from "./middleware/security.js";

const router = express.Router();

// GET pemelihara (maintenance assignees) for given asset numeric id or AsetId
router.get("/pemelihara/:assetId", requireUserOrAdmin, async (req, res) => {
  try {
    const assetParam = req.params.assetId;
    // Try numeric id first
    let [arows] = await db
      .promise()
      .query(
        "SELECT id, AsetId, NamaAset, beban_id FROM aset WHERE id = ? LIMIT 1",
        [assetParam]
      );
    if (!arows || arows.length === 0) {
      // Fallback: try AsetId string match
      [arows] = await db
        .promise()
        .query(
          "SELECT id, AsetId, NamaAset, beban_id FROM aset WHERE AsetId = ? LIMIT 1",
          [assetParam]
        );
    }
    if (!arows || arows.length === 0) return res.json({ pemelihara: [] });
    const asetRow = arows[0];
    const bebanId = asetRow.beban_id || null;
    if (!bebanId) return res.json({ pemelihara: [] });

    const [rows] = await db
      .promise()
      .query(
        "SELECT u.id, u.username, u.nama FROM beban_users bu JOIN user u ON bu.user_id = u.id WHERE bu.beban_id = ?",
        [bebanId]
      );
    const mapped = (rows || []).map((r) => ({
      id: r.id,
      username: r.username,
      nama: r.nama,
    }));
    res.json({
      pemelihara: mapped,
      beban_id: bebanId,
      asset: {
        id: asetRow.id,
        AsetId: asetRow.AsetId,
        NamaAset: asetRow.NamaAset,
      },
    });
  } catch (e) {
    console.error("[maintenance.pemelihara] error", e?.message || e);
    res.status(500).json({ message: e?.message || "Internal error" });
  }
});

// Helpers
async function logRiwayat(
  jenisAksi,
  userId,
  role,
  asetId,
  perubahan,
  tabelRef = "maintenance_schedules",
  recordId = null,
  conn = null
) {
  const q = `INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const perubahanJson = perubahan ? JSON.stringify(perubahan) : null;
  try {
    if (conn && conn.execute) {
      await conn.execute(q, [
        jenisAksi,
        userId,
        role,
        asetId,
        perubahanJson,
        tabelRef,
        recordId,
      ]);
    } else {
      await db
        .promise()
        .execute(q, [
          jenisAksi,
          userId,
          role,
          asetId,
          perubahanJson,
          tabelRef,
          recordId,
        ]);
    }
  } catch (err) {
    console.error("[riwayat]", err);
  }
}

// --- Maintenance Rules (CRUD) ---

// Create rule (admin)
router.post(
  "/rules",
  rateLimiter(),
  requireAdmin,
  sanitizeBody,
  validateRuleInput,
  async (req, res) => {
    const data = req.body || {};
    if (
      !data.asset_id ||
      !data.title ||
      !data.interval_value ||
      !data.interval_unit ||
      !data.start_date
    ) {
      return res.status(400).json({
        message:
          "asset_id, title, interval_value, interval_unit, start_date required",
      });
    }
    const username = req.cookies?.username || req.headers["x-username"];
    let createdBy = null;
    try {
      if (username) {
        const [urows] = await db
          .promise()
          .query("SELECT id FROM user WHERE username = ?", [username]);
        if (urows && urows.length > 0) createdBy = urows[0].id;
      }
      // Prevent duplicate rule creation from accidental double-submit by
      // checking for an existing identical rule first.
      const [existing] = await db
        .promise()
        .query(
          `SELECT * FROM maintenance_rules WHERE asset_id = ? AND title = ? AND interval_value = ? AND interval_unit = ? AND start_date = ? LIMIT 1`,
          [
            data.asset_id,
            data.title,
            data.interval_value,
            data.interval_unit,
            data.start_date,
          ]
        );
      if (existing && existing.length > 0) {
        // Return the existing rule instead of creating a duplicate
        return res
          .status(409)
          .json({ message: "Rule already exists", rule: existing[0] });
      }

      const q = `INSERT INTO maintenance_rules (asset_id, title, description, interval_value, interval_unit, start_date, anchor_type, enabled, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const vals = [
        data.asset_id,
        data.title,
        data.description || null,
        data.interval_value,
        data.interval_unit,
        data.start_date,
        data.anchor_type || "fixed",
        data.enabled === false ? 0 : 1,
        createdBy,
      ];
      const [r] = await db.promise().execute(q, vals);
      const [rows] = await db
        .promise()
        .query("SELECT * FROM maintenance_rules WHERE id = ?", [r.insertId]);
      // log riwayat for rule creation so frontend can show detail
      try {
        const roleReq = getRoleFromRequest(req);
        await logRiwayat(
          "maintenance_rule_create",
          createdBy,
          roleReq,
          data.asset_id,
          {
            rule_id: r.insertId,
            title: data.title,
            interval_value: data.interval_value,
            interval_unit: data.interval_unit,
            start_date: data.start_date,
            anchor_type: data.anchor_type || "fixed",
          },
          "maintenance_rules",
          r.insertId
        );
      } catch (e) {
        console.warn(
          "Failed to log riwayat for maintenance rule create:",
          e?.message || e
        );
      }
      // NOTE: initial schedule creation removed. The background generator
      // will create the upcoming schedule(s) to keep generation logic
      // centralized and avoid duplicate occurrences.
      // Create a single initial schedule for the rule at `start_date` (guarded)
      try {
        const insInitQ = `INSERT IGNORE INTO maintenance_schedules (rule_id, asset_id, due_date, meta) VALUES (?, ?, ?, ?)`;
        await db
          .promise()
          .execute(insInitQ, [
            r.insertId,
            data.asset_id,
            data.start_date,
            JSON.stringify({ generated_from_rule: r.insertId, initial: true }),
          ]);
      } catch (e) {
        console.warn("Failed to insert initial schedule:", e?.message || e);
      }

      // Immediately notify users who belong to the same `beban` as the asset.
      try {
        // Get the schedule id we just ensured exists (may have existed).
        // Using rule_id and ordering is more robust than exact due_date match
        // because of potential timezone/format differences.
        const [srows] = await db
          .promise()
          .query(
            "SELECT id, asset_id, due_date FROM maintenance_schedules WHERE rule_id = ? ORDER BY id DESC LIMIT 1",
            [r.insertId]
          );
        const schedule = srows && srows.length > 0 ? srows[0] : null;
        // Get asset's beban_id
        const [arows] = await db
          .promise()
          .query(
            "SELECT beban_id, NamaAset, AsetId FROM aset WHERE id = ? LIMIT 1",
            [data.asset_id]
          );
        const bebanId = arows && arows.length > 0 ? arows[0].beban_id : null;
        const assetName = arows && arows.length > 0 ? arows[0].NamaAset : null;
        const assetAsetId = arows && arows.length > 0 ? arows[0].AsetId : null;

        if (bebanId && schedule) {
          // Find users assigned to this beban
          const [urows] = await db
            .promise()
            .query("SELECT user_id FROM beban_users WHERE beban_id = ?", [
              bebanId,
            ]);
          if (urows && urows.length > 0) {
            const now = new Date();
            const sendDate = now.toISOString().slice(0, 19).replace("T", " ");
            const insertQ = `INSERT IGNORE INTO notification_logs (schedule_id, asset_id, user_id, beban_id, type, send_date, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            for (const ur of urows) {
              try {
                const payload = JSON.stringify({
                  rule_id: r.insertId,
                  title: data.title,
                  start_date: data.start_date,
                  message: `Jadwal pemeliharaan dibuat untuk ${
                    assetName || ""
                  } (${assetAsetId || data.asset_id})`,
                });
                await db
                  .promise()
                  .execute(insertQ, [
                    schedule.id,
                    data.asset_id,
                    ur.user_id,
                    bebanId,
                    "pre_due_daily",
                    sendDate,
                    payload,
                  ]);
              } catch (e) {
                // Non-fatal
                console.warn(
                  "Failed to insert notification log:",
                  e?.message || e
                );
              }
            }
          }
        }
      } catch (e) {
        console.warn(
          "Failed to notify beban users on rule create:",
          e?.message || e
        );
      }

      // Do not auto-run the generator here to avoid creating additional
      // future occurrences immediately; operator can run the generator
      // separately (cron/worker) to populate further schedules.
      return res.status(201).json({ message: "Rule created", rule: rows[0] });
    } catch (err) {
      console.error(
        "[maintenance] GET /schedules/:id error",
        err && err.stack ? err.stack : err
      );
      try {
        console.error("[maintenance] headers:", req.headers);
        console.error("[maintenance] cookies:", req.cookies);
      } catch (e) {
        console.error(
          "[maintenance] failed to log request context",
          e?.message || e
        );
      }
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// List rules (admin or scoped to user's beban)
router.get("/rules", rateLimiter(), requireUserOrAdmin, async (req, res) => {
  const role = getRoleFromRequest(req);
  try {
    if (role === "admin") {
      const [rows] = await db
        .promise()
        .query("SELECT * FROM maintenance_rules");
      return res.json({ rules: rows });
    }
    const bebanList = getBebanListFromRequest(req);
    if (!bebanList || bebanList.length === 0)
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    const { clause, params } = buildBebanFilterSQL("b.kode", bebanList);
    const q = `SELECT mr.* FROM maintenance_rules mr LEFT JOIN aset a ON mr.asset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause}`;
    const [rows] = await db.promise().query(q, params);
    return res.json({ rules: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal error" });
  }
});

// Get rule by id
router.get(
  "/rules/:id",
  rateLimiter(),
  requireUserOrAdmin,
  validateIdParam,
  async (req, res) => {
    const { id } = req.params;
    const role = getRoleFromRequest(req);
    try {
      const [rows] = await db
        .promise()
        .query("SELECT * FROM maintenance_rules WHERE id = ?", [id]);
      if (!rows || rows.length === 0)
        return res.status(404).json({ message: "Rule not found" });
      const rule = rows[0];
      if (role === "admin") return res.json({ rule });
      const bebanList = getBebanListFromRequest(req);
      const [arows] = await db
        .promise()
        .query(
          "SELECT b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.id = ?",
          [rule.asset_id]
        );
      const assetBeban = arows && arows.length > 0 ? arows[0].beban_kode : null;
      const allowed =
        assetBeban && buildBebanFilterSQL("b.kode", bebanList).clause !== "1=1"
          ? getBebanListFromRequest(req).some((b) =>
              assetBeban.startsWith(b.split("-")[0])
            )
          : false;
      if (!allowed) return res.status(403).json({ message: "Akses ditolak" });
      return res.json({ rule });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Update rule (admin)
router.put(
  "/rules/:id",
  rateLimiter(),
  requireAdmin,
  validateIdParam,
  sanitizeBody,
  validateRuleUpdate,
  async (req, res) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const fields = [];
      const vals = [];
      const allowed = [
        "title",
        "description",
        "interval_value",
        "interval_unit",
        "start_date",
        "anchor_type",
        "enabled",
      ];
      allowed.forEach((f) => {
        if (data[f] !== undefined) {
          fields.push(`${f} = ?`);
          vals.push(data[f]);
        }
      });
      if (fields.length === 0)
        return res.status(400).json({ message: "No fields to update" });
      vals.push(id);
      const q = `UPDATE maintenance_rules SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      await db.promise().execute(q, vals);
      const [rows] = await db
        .promise()
        .query("SELECT * FROM maintenance_rules WHERE id = ?", [id]);
      return res.json({ message: "Rule updated", rule: rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Delete rule (admin)
router.delete(
  "/rules/:id",
  rateLimiter(),
  requireAdmin,
  validateIdParam,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db
        .promise()
        .execute("DELETE FROM maintenance_rules WHERE id = ?", [id]);
      return res.json({ message: "Rule deleted" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// --- Maintenance Schedules (listing & detail) ---

// List schedules
router.get(
  "/schedules",
  rateLimiter(),
  requireUserOrAdmin,
  validateScheduleQuery,
  async (req, res) => {
    const role = getRoleFromRequest(req);
    const { asset_id, rule_id, status, due_before, due_after } = req.query;
    let limit = parseInt(req.query.limit || "50", 10);
    let offset = parseInt(req.query.offset || "0", 10);
    try {
      const where = [];
      const params = [];
      if (asset_id) {
        where.push("s.asset_id = ?");
        params.push(asset_id);
      }
      if (rule_id) {
        where.push("s.rule_id = ?");
        params.push(rule_id);
      }
      if (status) {
        where.push("s.status = ?");
        params.push(status);
      }
      if (due_before) {
        where.push("s.due_date <= ?");
        params.push(due_before);
      }
      if (due_after) {
        where.push("s.due_date >= ?");
        params.push(due_after);
      }

      if (role !== "admin") {
        const bebanList = getBebanListFromRequest(req);
        if (!bebanList || bebanList.length === 0)
          return res
            .status(403)
            .json({ message: "Akses ditolak: beban tidak ditemukan" });
        const { clause, params: bparams } = buildBebanFilterSQL(
          "b.kode",
          bebanList
        );
        // join aset and beban
        const q = `SELECT s.* FROM maintenance_schedules s LEFT JOIN aset a ON s.asset_id = a.id LEFT JOIN beban b ON a.beban_id = b.id WHERE ${clause} ${
          where.length > 0 ? "AND " + where.join(" AND ") : ""
        } ORDER BY s.due_date ASC LIMIT ? OFFSET ?`;
        const finalParams = [...bparams, ...params, limit, offset];
        const [rows] = await db.promise().query(q, finalParams);
        return res.json({ schedules: rows, meta: { limit, offset } });
      }

      // admin
      const q = `SELECT s.* FROM maintenance_schedules s ${
        where.length > 0 ? "WHERE " + where.join(" AND ") : ""
      } ORDER BY s.due_date ASC LIMIT ? OFFSET ?`;
      const finalParams = [...params, limit, offset];
      const [rows] = await db.promise().query(q, finalParams);
      return res.json({ schedules: rows, meta: { limit, offset } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Get schedule detail
router.get(
  "/schedules/:id",
  rateLimiter(),
  requireUserOrAdmin,
  validateIdParam,
  async (req, res) => {
    const { id } = req.params;
    const role = getRoleFromRequest(req);
    try {
      const [rows] = await db
        .promise()
        .query(
          "SELECT s.*, r.title as rule_title, r.interval_value, r.interval_unit, r.anchor_type FROM maintenance_schedules s LEFT JOIN maintenance_rules r ON s.rule_id = r.id WHERE s.id = ?",
          [id]
        );
      if (!rows || rows.length === 0)
        return res.status(404).json({ message: "Schedule not found" });
      const s = rows[0];
      if (role !== "admin") {
        const bebanList = getBebanListFromRequest(req);
        if (!bebanList || bebanList.length === 0)
          return res
            .status(403)
            .json({ message: "Akses ditolak: beban tidak ditemukan" });
        const [ar] = await db
          .promise()
          .query(
            "SELECT b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.id = ?",
            [s.asset_id]
          );
        const assetBeban = ar && ar.length > 0 ? ar[0].beban_kode : null;
        const { clause } = buildBebanFilterSQL("b.kode", bebanList);
        const allowed =
          assetBeban && clause !== "1=1"
            ? bebanList.some((b) => assetBeban.startsWith(b.split("-")[0]))
            : false;
        if (!allowed) return res.status(403).json({ message: "Akses ditolak" });
      }
      // fetch recent logs and return the schedule object directly (attach logs)
      const [logs] = await db
        .promise()
        .query(
          "SELECT * FROM maintenance_logs WHERE schedule_id = ? ORDER BY created_at DESC LIMIT 5",
          [id]
        );
      s.logs = logs || [];
      return res.json(s);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Update schedule (admin)
router.put(
  "/schedules/:id",
  rateLimiter(),
  requireAdmin,
  validateIdParam,
  sanitizeBody,
  validateScheduleUpdate,
  async (req, res) => {
    const { id } = req.params;
    const data = req.body || {};
    try {
      const fields = [];
      const vals = [];
      const allowed = [
        "status",
        "claimed_by",
        "claimed_at",
        "completed_at",
        "due_date",
      ];
      allowed.forEach((f) => {
        if (data[f] !== undefined) {
          fields.push(`${f} = ?`);
          vals.push(data[f]);
        }
      });
      if (fields.length === 0)
        return res.status(400).json({ message: "No fields to update" });
      vals.push(id);
      const q = `UPDATE maintenance_schedules SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      await db.promise().execute(q, vals);
      const [rows] = await db
        .promise()
        .query("SELECT * FROM maintenance_schedules WHERE id = ?", [id]);
      return res.json({ message: "Schedule updated", schedule: rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Delete schedule (admin)
router.delete(
  "/schedules/:id",
  rateLimiter(),
  requireAdmin,
  validateIdParam,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db
        .promise()
        .execute("DELETE FROM maintenance_schedules WHERE id = ?", [id]);
      return res.json({ message: "Schedule deleted" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Claim a schedule (atomic)
router.post(
  "/:id/claim",
  rateLimiter(),
  requireUserOrAdmin,
  validateIdParam,
  async (req, res) => {
    const { id } = req.params;
    const username = req.cookies?.username || req.headers["x-username"];
    const role = getRoleFromRequest(req);
    const userId = null;

    try {
      // Get user id
      let uid = null;
      if (username) {
        const [rows] = await db
          .promise()
          .query("SELECT id, role FROM user WHERE username = ?", [username]);
        if (rows && rows.length > 0) uid = rows[0].id;
      }

      const conn = await db.promise().getConnection();
      try {
        await conn.beginTransaction();

        // lock the schedule row
        const [srows0] = await conn.query(
          "SELECT * FROM maintenance_schedules WHERE id = ? FOR UPDATE",
          [id]
        );
        if (!srows0 || srows0.length === 0) {
          await conn.rollback();
          return res.status(404).json({ message: "Schedule not found" });
        }
        const sched0 = srows0[0];

        // Authorization: non-admin users must have beban access to the asset
        const roleReq = getRoleFromRequest(req);
        if (roleReq !== "admin") {
          const bebanList = getBebanListFromRequest(req);
          if (!bebanList || bebanList.length === 0) {
            await conn.rollback();
            return res
              .status(403)
              .json({ message: "Akses ditolak: beban tidak ditemukan" });
          }
          const [arows] = await conn.query(
            "SELECT b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.id = ?",
            [sched0.asset_id]
          );
          const assetBeban =
            arows && arows.length > 0 ? arows[0].beban_kode : null;
          if (!assetBeban || !isSameLocation(bebanList, assetBeban)) {
            await conn.rollback();
            return res.status(403).json({ message: "Akses ditolak" });
          }
        }

        // Ensure still pending and not claimed
        if (sched0.status !== "pending" || sched0.claimed_by) {
          await conn.rollback();
          return res
            .status(409)
            .json({ message: "Schedule already claimed or not pending" });
        }

        const q = `UPDATE maintenance_schedules SET claimed_by = ?, claimed_at = NOW(), status = 'claimed' WHERE id = ?`;
        const [result] = await conn.execute(q, [uid, id]);
        if (result.affectedRows !== 1) {
          await conn.rollback();
          return res
            .status(409)
            .json({ message: "Schedule already claimed or not pending" });
        }

        // insert riwayat within same transaction
        await logRiwayat(
          "maintenance_claim",
          uid,
          role,
          sched0.asset_id,
          { schedule_id: id },
          "maintenance_schedules",
          id,
          conn
        );

        await conn.commit();
        return res.json({ message: "Claimed", schedule_id: id });
      } catch (e) {
        await conn.rollback();
        console.error(e);
        return res.status(500).json({ message: "Internal error" });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Complete a schedule
router.post(
  "/:id/complete",
  rateLimiter(),
  requireUserOrAdmin,
  validateIdParam,
  sanitizeBody,
  validateCompleteBody,
  async (req, res) => {
    const { id } = req.params;
    const data = req.body || {};
    const username = req.cookies?.username || req.headers["x-username"];

    try {
      // get user id
      let uid = null;
      if (username) {
        const [rows] = await db
          .promise()
          .query("SELECT id, role FROM user WHERE username = ?", [username]);
        if (rows && rows.length > 0) uid = rows[0].id;
      }

      // validate schedule and claim
      const [srows] = await db
        .promise()
        .query("SELECT * FROM maintenance_schedules WHERE id = ?", [id]);
      if (!srows || srows.length === 0)
        return res.status(404).json({ message: "Schedule not found" });
      const sched = srows[0];

      // Authorization: non-admin users must have beban access to the asset
      const roleReq = getRoleFromRequest(req);
      if (roleReq !== "admin") {
        const bebanList = getBebanListFromRequest(req);
        if (!bebanList || bebanList.length === 0)
          return res
            .status(403)
            .json({ message: "Akses ditolak: beban tidak ditemukan" });
        const [arows] = await db
          .promise()
          .query(
            "SELECT b.kode as beban_kode FROM aset a LEFT JOIN beban b ON a.beban_id = b.id WHERE a.id = ?",
            [sched.asset_id]
          );
        const assetBeban =
          arows && arows.length > 0 ? arows[0].beban_kode : null;
        if (!assetBeban || !isSameLocation(bebanList, assetBeban))
          return res.status(403).json({ message: "Akses ditolak" });
      }
      if (sched.status === "completed")
        return res
          .status(200)
          .json({ message: "Already completed", schedule_id: id });
      if (sched.claimed_by && uid && sched.claimed_by !== uid)
        return res.status(403).json({ message: "Not the claimer" });

      // Insert maintenance_log and update schedule in a transaction
      const conn = await db.promise().getConnection();
      try {
        await conn.beginTransaction();
        const performedAt = data.performed_at || new Date();

        // Prevent duplicate logs on retries: check if a similar log exists
        const [existing] = await conn.query(
          "SELECT id FROM maintenance_logs WHERE schedule_id = ? AND performed_by = ? AND performed_at = ? LIMIT 1",
          [id, uid, performedAt]
        );
        let logId = null;
        if (existing && existing.length > 0) {
          logId = existing[0].id;
        } else {
          const insertLogQ = `INSERT INTO maintenance_logs (schedule_id, asset_id, performed_by, performed_at, description, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          const [r] = await conn.execute(insertLogQ, [
            id,
            sched.asset_id,
            uid,
            performedAt,
            data.description || null,
            data.cost || null,
            data.notes || null,
          ]);
          logId = r.insertId;
        }

        const updateSchedQ = `UPDATE maintenance_schedules SET status = 'completed', completed_at = NOW() WHERE id = ?`;
        await conn.execute(updateSchedQ, [id]);

        // decide next due based on rule's anchor_type
        const [r1] = await conn.query(
          "SELECT * FROM maintenance_rules WHERE id = ?",
          [sched.rule_id]
        );
        if (r1 && r1.length > 0) {
          const rule = r1[0];
          // compute next_due: if anchor_type='sliding' use performedAt else use sched.due_date
          const baseDate =
            rule.anchor_type === "sliding"
              ? new Date(performedAt)
              : new Date(sched.due_date);
          // use simple SQL DATE_ADD via INSERT ... SELECT or compute in JS
          let nextDue = null;
          const iv = rule.interval_value;
          const iu = rule.interval_unit;
          const d = new Date(baseDate);
          if (iu === "day") d.setDate(d.getDate() + iv);
          else if (iu === "week") d.setDate(d.getDate() + iv * 7);
          else if (iu === "month") d.setMonth(d.getMonth() + iv);
          else if (iu === "year") d.setFullYear(d.getFullYear() + iv);
          nextDue = d.toISOString().split("T")[0];

          // insert next schedule if not exists
          const insQ = `INSERT IGNORE INTO maintenance_schedules (rule_id, asset_id, due_date, meta) VALUES (?, ?, ?, ?)`;
          await conn.execute(insQ, [
            sched.rule_id,
            sched.asset_id,
            nextDue,
            JSON.stringify({ generated_from: id }),
          ]);
        }

        await conn.commit();

        // log riwayat
        await logRiwayat(
          "maintenance_complete",
          uid,
          null,
          sched.asset_id,
          {
            schedule_id: id,
            description: data.description,
            cost: data.cost,
            log_id: logId,
          },
          "maintenance_schedules",
          id
        );

        return res.json({ message: "Completed", schedule_id: id });
      } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.status(500).json({ message: "Failed to complete" });
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal error" });
    }
  }
);

// Trigger notifications run (admin only)
router.post("/notify", rateLimiter(), requireAdmin, async (req, res) => {
  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "sendNotifications.js"
    );
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return res.status(202).json({ message: "Notification job started" });
  } catch (e) {
    console.error("Failed to spawn notification job:", e?.message || e);
    return res.status(500).json({ message: "Failed to start job" });
  }
});

export default router;
