import db from "../db.js";
import { emitMetric } from "../src/utils/metrics.js";

async function run() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // find pending schedules
    const [schedules] = await db
      .promise()
      .query(
        "SELECT s.*, r.interval_value, r.interval_unit FROM maintenance_schedules s JOIN maintenance_rules r ON s.rule_id = r.id WHERE s.status = 'pending'"
      );

    for (const s of schedules) {
      const due = new Date(s.due_date);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));

      let notifType = null;
      if (diffDays > 7 && diffDays <= 30) {
        // weekly window: send once per 7 days
        notifType = "pre_due_weekly";
        // check if sent in last 7 days
        const [l] = await db
          .promise()
          .query(
            "SELECT send_date FROM notification_logs WHERE schedule_id = ? AND type = ? ORDER BY send_date DESC LIMIT 1",
            [s.id, notifType]
          );
        if (l && l.length > 0) {
          const lastSent = new Date(l[0].send_date);
          const daysSince = Math.floor(
            (today - lastSent) / (1000 * 60 * 60 * 24)
          );
          if (daysSince < 7) {
            notifType = null;
          }
        }
      } else if (diffDays >= 0 && diffDays <= 7) {
        notifType = "pre_due_daily";
      } else if (diffDays < 0) {
        notifType = "overdue_daily";
      }

      if (!notifType) continue;

      // find users for asset's beban
      const [aRows] = await db
        .promise()
        .query("SELECT a.id, a.beban_id FROM aset a WHERE a.id = ?", [
          s.asset_id,
        ]);
      if (!aRows || aRows.length === 0) continue;
      const bebanId = aRows[0].beban_id;
      const [users] = await db
        .promise()
        .query(
          "SELECT u.id FROM beban_users bu JOIN user u ON bu.user_id = u.id WHERE bu.beban_id = ?",
          [bebanId]
        );

      // Also include admin users so admins see maintenance notifications
      let adminUsers = [];
      try {
        const [aUsers] = await db
          .promise()
          .query("SELECT id FROM user WHERE LOWER(role) = 'admin'");
        adminUsers = Array.isArray(aUsers) ? aUsers : [];
      } catch (e) {
        adminUsers = [];
      }

      // Merge and dedupe user ids
      const userIdSet = new Set();
      const mergedUsers = [];
      (users || []).forEach((u) => {
        if (u && u.id && !userIdSet.has(u.id)) {
          userIdSet.add(u.id);
          mergedUsers.push({ id: u.id });
        }
      });
      (adminUsers || []).forEach((a) => {
        if (a && a.id && !userIdSet.has(a.id)) {
          userIdSet.add(a.id);
          mergedUsers.push({ id: a.id });
        }
      });

      // use mergedUsers for broadcasting
      const targetUsers = mergedUsers;

      // process users in batches to limit memory and allow metrics
      const BATCH = 200;
      for (let i = 0; i < targetUsers.length; i += BATCH) {
        const batch = targetUsers.slice(i, i + BATCH);
        const inserts = batch.map((u) => [
          s.id,
          s.asset_id,
          u.id,
          bebanId,
          notifType,
          today.toISOString(),
          JSON.stringify({ due_date: s.due_date }),
        ]);
        // run sequentially per batch
        for (const vals of inserts) {
          try {
            await db
              .promise()
              .execute(
                "INSERT INTO notification_logs (schedule_id, asset_id, user_id, beban_id, type, send_date, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
                vals
              );
          } catch (err) {
            // duplicate key or other error -> skip
          }
        }
        // emit metric for this broadcast batch
        try {
          const { emitMetric } = await import("../src/utils/metrics.js");
          emitMetric("sendNotifications.broadcast", batch.length, {
            type: notifType,
          });
        } catch (e) {}
      }
    }

    console.log("Notifications processed.");
    emitMetric("sendNotifications.run", 1, { status: "success" });
    process.exit(0);
  } catch (err) {
    console.error(err);
    emitMetric("sendNotifications.run", 0, {
      status: "failure",
      error: String(err),
    });
    process.exit(1);
  }
}

run();
