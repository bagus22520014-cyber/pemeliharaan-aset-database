import db from "../db.js";
import { execSync } from "child_process";

const ASET = process.argv[2] || "0001/MLG-NET/2025";

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

async function run() {
  try {
    console.log("Looking up asset:", ASET);
    const [ar] = await db
      .promise()
      .query("SELECT id, AsetId, NamaAset FROM aset WHERE AsetId = ? LIMIT 1", [
        ASET,
      ]);
    if (!ar || ar.length === 0) {
      console.log("Asset not found. Aborting.");
      process.exit(2);
    }
    const asset = ar[0];
    console.log("Found asset:", {
      id: asset.id,
      AsetId: asset.AsetId,
      NamaAset: asset.NamaAset,
    });

    // create a short-interval rule
    const today = new Date();
    const startDate = formatDate(today);
    const [rcheck] = await db
      .promise()
      .query("SELECT id FROM maintenance_rules WHERE asset_id = ? LIMIT 1", [
        asset.id,
      ]);
    if (rcheck && rcheck.length > 0) {
      console.log("Existing rule found, reusing id", rcheck[0].id);
      var ruleId = rcheck[0].id;
    } else {
      const [ri] = await db
        .promise()
        .execute(
          "INSERT INTO maintenance_rules (asset_id, title, description, interval_value, interval_unit, start_date, anchor_type, enabled, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            asset.id,
            "E2E Rule",
            "Auto-generated for E2E test",
            1,
            "day",
            startDate,
            "fixed",
            1,
            null,
          ]
        );
      ruleId = ri.insertId;
      console.log("Inserted rule id", ruleId);
    }

    console.log("Running schedule generator...");
    try {
      execSync("node scripts/generateSchedules.js", { stdio: "inherit" });
    } catch (e) {
      console.warn(
        "Generator exited with non-zero (may still have created schedules)"
      );
    }

    const [srows] = await db
      .promise()
      .query(
        "SELECT * FROM maintenance_schedules WHERE rule_id = ? ORDER BY due_date ASC LIMIT 1",
        [ruleId]
      );
    if (!srows || srows.length === 0) {
      console.log("No schedules generated for rule", ruleId);
      process.exit(3);
    }
    const sched = srows[0];
    console.log("Found schedule:", { id: sched.id, due_date: sched.due_date });

    console.log("Running sendNotifications...");
    try {
      execSync("node scripts/sendNotifications.js", { stdio: "inherit" });
    } catch (e) {
      console.warn("sendNotifications exited non-zero");
    }

    const [nrows] = await db
      .promise()
      .query(
        "SELECT * FROM notification_logs WHERE schedule_id = ? ORDER BY send_date DESC LIMIT 5",
        [sched.id]
      );
    console.log(
      `Notification logs for schedule ${sched.id}: count=${nrows.length}`
    );

    // create perbaikan as user (diajukan)
    const perbaikanDate = formatDate(new Date());
    const [p] = await db
      .promise()
      .execute(
        "INSERT INTO perbaikan (aset_id, schedule_id, tanggal_perbaikan, deskripsi, biaya, teknisi, PurchaseOrder, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          asset.id,
          sched.id,
          perbaikanDate,
          "E2E perbaikan",
          0,
          "E2E",
          null,
          "diajukan",
        ]
      );
    const perbaikanId = p.insertId;
    console.log("Inserted perbaikan id", perbaikanId);

    // Simulate admin approval: set approval_status and auto-complete schedule
    await db
      .promise()
      .execute(
        "UPDATE perbaikan SET approval_status = 'disetujui', approval_date = NOW() WHERE id = ?",
        [perbaikanId]
      );
    console.log("Perbaikan approved (DB updated)");

    // Now perform completion steps similar to approval auto-complete
    // Insert maintenance_log
    const [existLog] = await db
      .promise()
      .query("SELECT id FROM maintenance_logs WHERE schedule_id = ? LIMIT 1", [
        sched.id,
      ]);
    let logId = null;
    if (existLog && existLog.length > 0) {
      logId = existLog[0].id;
      console.log("Existing maintenance_log found", logId);
    } else {
      const [li] = await db
        .promise()
        .execute(
          "INSERT INTO maintenance_logs (schedule_id, asset_id, performed_by, performed_at, description, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            sched.id,
            asset.id,
            null,
            perbaikanDate,
            "Auto-complete via approval",
            0,
            JSON.stringify({ perbaikan: perbaikanId }),
          ]
        );
      logId = li.insertId;
      console.log("Inserted maintenance_log id", logId);
    }

    // Update schedule to completed
    await db
      .promise()
      .execute(
        "UPDATE maintenance_schedules SET status = 'completed', completed_at = NOW() WHERE id = ?",
        [sched.id]
      );
    console.log("Marked schedule completed", sched.id);

    // compute next due based on rule
    const [rrows] = await db
      .promise()
      .query("SELECT * FROM maintenance_rules WHERE id = ?", [ruleId]);
    if (rrows && rrows.length > 0) {
      const rule = rrows[0];
      const baseDate =
        rule.anchor_type === "sliding"
          ? new Date(perbaikanDate)
          : new Date(sched.due_date);
      const iv = rule.interval_value || 1;
      const iu = rule.interval_unit || "day";
      const d = new Date(baseDate);
      if (iu === "day") d.setDate(d.getDate() + iv);
      else if (iu === "week") d.setDate(d.getDate() + iv * 7);
      else if (iu === "month") d.setMonth(d.getMonth() + iv);
      else if (iu === "year") d.setFullYear(d.getFullYear() + iv);
      const nextDue = formatDate(d);
      await db
        .promise()
        .execute(
          "INSERT IGNORE INTO maintenance_schedules (rule_id, asset_id, due_date, meta) VALUES (?, ?, ?, ?)",
          [
            ruleId,
            asset.id,
            nextDue,
            JSON.stringify({ generated_from: sched.id }),
          ]
        );
      console.log("Inserted/ensured next schedule for due", nextDue);
    }

    // verify next schedule
    const [nxt] = await db
      .promise()
      .query(
        "SELECT * FROM maintenance_schedules WHERE rule_id = ? AND id != ? ORDER BY due_date ASC LIMIT 5",
        [ruleId, sched.id]
      );
    console.log("Next schedules count:", nxt.length);

    console.log("E2E test sequence completed.");
    process.exit(0);
  } catch (err) {
    console.error("E2E test failed:", err);
    process.exit(4);
  }
}

run();
