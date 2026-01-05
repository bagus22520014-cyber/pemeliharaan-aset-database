import db from "../db.js";

(async () => {
  try {
    const [create] = await db
      .promise()
      .query("SHOW CREATE TABLE `notification`");
    console.log("--- SHOW CREATE TABLE notification ---");
    console.log(create[0]["Create Table"]);

    console.log("\n--- Recent rows (limit 100) ---");
    const [rows] = await db
      .promise()
      .query(
        `SELECT id,user_id,judul,pesan,tabel_ref,record_id,dibaca,created_at FROM notification ORDER BY id DESC LIMIT 100`
      );
    console.log(JSON.stringify(rows, null, 2));

    console.log("\n--- Unread count ---");
    const [cnt] = await db
      .promise()
      .query(
        `SELECT COUNT(*) as unread FROM notification WHERE dibaca = FALSE OR dibaca = 0 OR dibaca IS NULL`
      );
    console.log(JSON.stringify(cnt[0]));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();
