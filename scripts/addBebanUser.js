import db from "../db.js";

async function run() {
  try {
    const bebanId = 8; // beban_id for MLG-NET
    const userId = 2; // user1
    const [r] = await db
      .promise()
      .execute(
        "INSERT IGNORE INTO beban_users (beban_id, user_id) VALUES (?, ?)",
        [bebanId, userId]
      );
    console.log("Inserted mapping", {
      bebanId,
      userId,
      affectedRows: r.affectedRows,
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
