import db from "../db.js";

async function run() {
  try {
    const username = process.argv[2] || "test_notify";
    const [urows] = await db
      .promise()
      .query(
        "SELECT id, username, Beban FROM user WHERE username = ? LIMIT 1",
        [username]
      );
    console.log("user rows:", urows);
    if (!urows || urows.length === 0) return console.log("user not found");
    const userId = urows[0].id;
    const bebanRaw = urows[0].Beban;
    console.log("raw Beban value from user row:", bebanRaw);
    // parse beban as backend does
    let bebanArray = [];
    if (bebanRaw) {
      if (Array.isArray(bebanRaw)) bebanArray = bebanRaw;
      else if (typeof bebanRaw === "string") {
        const trimmed = bebanRaw.trim();
        if (trimmed.startsWith("[")) {
          try {
            bebanArray = JSON.parse(trimmed);
          } catch (e) {}
        }
        if (bebanArray.length === 0) {
          if (trimmed.includes(","))
            bebanArray = trimmed
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          else if (trimmed !== "") bebanArray = [trimmed];
        }
      }
    }
    console.log("parsed bebanArray:", bebanArray);
    if (!bebanArray || bebanArray.length === 0)
      return console.log("no beban values to sync");

    const placeholders = bebanArray.map(() => "?").join(",");
    const qBeban = `SELECT id,kode FROM beban WHERE kode IN (${placeholders})`;
    const [bebanRows] = await db.promise().query(qBeban, bebanArray);
    console.log("resolved beban rows:", bebanRows);

    // delete existing
    const [dres] = await db
      .promise()
      .execute("DELETE FROM beban_users WHERE user_id = ?", [userId]);
    console.log("deleted existing mappings count", dres.affectedRows);
    if (!bebanRows || bebanRows.length === 0)
      return console.log("no beban rows resolved");
    const inserts = bebanRows.map((b) => [b.id, userId]);
    const insQ = "INSERT IGNORE INTO beban_users (beban_id, user_id) VALUES ?";
    const [ins] = await db.promise().query(insQ, [inserts]);
    console.log("insert result:", ins);

    const [final] = await db
      .promise()
      .query(
        "SELECT bu.id, bu.beban_id, b.kode, bu.user_id, u.username FROM beban_users bu LEFT JOIN beban b ON bu.beban_id=b.id LEFT JOIN user u ON bu.user_id=u.id WHERE bu.user_id = ?",
        [userId]
      );
    console.log("final mappings:", final);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
