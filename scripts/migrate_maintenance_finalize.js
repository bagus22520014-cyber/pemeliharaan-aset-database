import db from "../db.js";

async function run() {
  // This script makes best-effort alterations: create missing tables with FKs
  // or add FK constraints and indexes if tables already exist.
  const stmts = [
    // Ensure beban_users exists (with FK)
    `CREATE TABLE IF NOT EXISTS beban_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      beban_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ub_beban_user (beban_id, user_id),
      INDEX idx_beban_users_beban (beban_id),
      INDEX idx_beban_users_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // maintenance_rules with FK to assets and created_by
    `CREATE TABLE IF NOT EXISTS maintenance_rules (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      asset_id INT UNSIGNED NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      interval_value INT UNSIGNED NOT NULL,
      interval_unit ENUM('day','week','month','year') NOT NULL,
      start_date DATE NOT NULL,
      anchor_type ENUM('fixed','sliding') NOT NULL DEFAULT 'fixed',
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL,
      INDEX idx_mr_asset (asset_id),
      INDEX idx_mr_created_by (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // maintenance_schedules with FK to rules, assets, users
    `CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      rule_id INT UNSIGNED NOT NULL,
      asset_id INT UNSIGNED NOT NULL,
      due_date DATE NOT NULL,
      status ENUM('pending','claimed','completed','cancelled') NOT NULL DEFAULT 'pending',
      claimed_by INT UNSIGNED NULL,
      claimed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      meta JSON NULL,
      UNIQUE KEY uq_rule_due (rule_id, due_date),
      INDEX idx_ms_asset_due (asset_id, due_date),
      INDEX idx_ms_rule (rule_id),
      INDEX idx_ms_claimed_by (claimed_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // maintenance_logs with FKs
    `CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      schedule_id INT UNSIGNED NOT NULL,
      asset_id INT UNSIGNED NOT NULL,
      performed_by INT UNSIGNED NULL,
      performed_at DATETIME NOT NULL,
      description TEXT NULL,
      cost BIGINT NULL,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ml_schedule (schedule_id),
      INDEX idx_ml_asset (asset_id),
      INDEX idx_ml_performed_by (performed_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // notification_logs
    `CREATE TABLE IF NOT EXISTS notification_logs (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      schedule_id INT UNSIGNED NULL,
      asset_id INT UNSIGNED NULL,
      user_id INT UNSIGNED NULL,
      beban_id INT UNSIGNED NULL,
      type ENUM('pre_due_weekly','pre_due_daily','overdue_daily') NOT NULL,
      send_date DATETIME NOT NULL,
      payload JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schedule_user_type_date (schedule_id, user_id, type, send_date),
      INDEX idx_nl_schedule (schedule_id),
      INDEX idx_nl_user (user_id),
      INDEX idx_nl_beban (beban_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  // Alter to add FK constraints (best-effort, ignore if exist)
  const alterStmts = [
    `ALTER TABLE beban_users ADD CONSTRAINT fk_bebanusers_beban FOREIGN KEY (beban_id) REFERENCES beban(id) ON DELETE CASCADE`,
    `ALTER TABLE beban_users ADD CONSTRAINT fk_bebanusers_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE`,

    `ALTER TABLE maintenance_rules ADD CONSTRAINT fk_mr_asset FOREIGN KEY (asset_id) REFERENCES aset(id) ON DELETE CASCADE`,
    `ALTER TABLE maintenance_rules ADD CONSTRAINT fk_mr_createdby FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE SET NULL`,

    `ALTER TABLE maintenance_schedules ADD CONSTRAINT fk_ms_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id) ON DELETE CASCADE`,
    `ALTER TABLE maintenance_schedules ADD CONSTRAINT fk_ms_asset FOREIGN KEY (asset_id) REFERENCES aset(id) ON DELETE CASCADE`,
    `ALTER TABLE maintenance_schedules ADD CONSTRAINT fk_ms_claimedby FOREIGN KEY (claimed_by) REFERENCES user(id) ON DELETE SET NULL`,

    `ALTER TABLE maintenance_logs ADD CONSTRAINT fk_ml_schedule FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(id) ON DELETE CASCADE`,
    `ALTER TABLE maintenance_logs ADD CONSTRAINT fk_ml_asset FOREIGN KEY (asset_id) REFERENCES aset(id) ON DELETE CASCADE`,
    `ALTER TABLE maintenance_logs ADD CONSTRAINT fk_ml_performedby FOREIGN KEY (performed_by) REFERENCES user(id) ON DELETE SET NULL`,

    `ALTER TABLE notification_logs ADD CONSTRAINT fk_nl_schedule FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(id) ON DELETE CASCADE`,
    `ALTER TABLE notification_logs ADD CONSTRAINT fk_nl_asset FOREIGN KEY (asset_id) REFERENCES aset(id) ON DELETE CASCADE`,
    `ALTER TABLE notification_logs ADD CONSTRAINT fk_nl_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE`,
    `ALTER TABLE notification_logs ADD CONSTRAINT fk_nl_beban FOREIGN KEY (beban_id) REFERENCES beban(id) ON DELETE CASCADE`,
  ];

  try {
    for (const s of stmts) {
      console.log("Ensuring table:,", s.split("\n")[0]);
      await db.promise().execute(s);
    }

    for (const a of alterStmts) {
      try {
        console.log("Executing alter:", a.split("ADD CONSTRAINT")[0].trim());
        await db.promise().execute(a);
      } catch (err) {
        // ignore errors (constraint exists or missing parent)
        console.warn("Alter warning (ignored):", err.message);
      }
    }

    console.log("Finalize migration completed.");
    process.exit(0);
  } catch (err) {
    console.error("Migration finalize failed:", err);
    process.exit(1);
  }
}

run();
