import db from "../db.js";

async function run() {
  try {
    // Add read_at and delivered_via if missing
    await db
      .promise()
      .execute(
        `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS read_at DATETIME NULL`
      );
  } catch (err) {
    // some MySQL versions don't support IF NOT EXISTS for ALTER COLUMN, try safer flow
    try {
      const [cols] = await db
        .promise()
        .query(`SHOW COLUMNS FROM notification_logs LIKE 'read_at'`);
      if (!cols || cols.length === 0) {
        await db
          .promise()
          .execute(
            `ALTER TABLE notification_logs ADD COLUMN read_at DATETIME NULL`
          );
        console.log("Added read_at");
      } else {
        console.log("read_at already exists");
      }
    } catch (e) {
      console.warn("Could not add read_at directly:", e.message);
    }
  }

  try {
    const [cols2] = await db
      .promise()
      .query(`SHOW COLUMNS FROM notification_logs LIKE 'delivered_via'`);
    if (!cols2 || cols2.length === 0) {
      await db
        .promise()
        .execute(
          `ALTER TABLE notification_logs ADD COLUMN delivered_via VARCHAR(50) NULL`
        );
      console.log("Added delivered_via");
    } else {
      console.log("delivered_via already exists");
    }
  } catch (e) {
    console.warn("Could not add delivered_via:", e.message);
  }

  console.log("Migration finished.");
  process.exit(0);
}

run();
