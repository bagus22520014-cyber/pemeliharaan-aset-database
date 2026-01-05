import db from "../db.js";

(async () => {
  try {
    const [admins] = await db
      .promise()
      .query("SELECT id,username,role FROM user WHERE role='admin' LIMIT 50");
    console.log(JSON.stringify(admins, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();
