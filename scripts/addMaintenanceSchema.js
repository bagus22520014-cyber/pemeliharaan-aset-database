import db from "../db.js";

async function run() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS beban_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      beban_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ub_beban_user (beban_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

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
      INDEX idx_asset_id (asset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

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
      INDEX idx_asset_due (asset_id, due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

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
      INDEX idx_schedule_id (schedule_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

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
      UNIQUE KEY uq_schedule_user_type_date (schedule_id, user_id, type, send_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  try {
    for (const sql of statements) {
      console.log("Executing:", sql.split("\n")[0]);
      // use promise wrapper
      await db.promise().execute(sql);
    }
    console.log("All maintenance tables created/ensured.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();
