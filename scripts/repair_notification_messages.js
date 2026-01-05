import db from "../db.js";

async function run() {
  try {
    const [rows] = await db.promise().query(
      `SELECT id, schedule_id, asset_id, payload FROM notification_logs WHERE payload LIKE '%Jadwal pemeliharaan dibuat untuk%'
        `
    );

    console.log(`Found ${rows.length} notification_logs to update`);
    for (const r of rows) {
      try {
        const assetId = r.asset_id;
        const [arows] = await db
          .promise()
          .query("SELECT NamaAset, AsetId FROM aset WHERE id = ? LIMIT 1", [
            assetId,
          ]);
        const assetName = arows && arows.length > 0 ? arows[0].NamaAset : null;
        const assetAsetId = arows && arows.length > 0 ? arows[0].AsetId : null;
        if (!assetName) {
          console.log(
            `Skipping id=${r.id}: asset name not found for asset_id=${assetId}`
          );
          continue;
        }

        let payload;
        if (typeof r.payload === "object" && r.payload !== null) {
          payload = r.payload;
        } else {
          try {
            payload = JSON.parse(r.payload);
          } catch (e) {
            // try to coerce JS-like object literal to JSON
            try {
              let s = String(r.payload).trim();
              // quote unquoted keys: { key: -> { "key":
              s = s.replace(/([,{]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
              // convert single quotes to double quotes
              s = s.replace(/'/g, '"');
              payload = JSON.parse(s);
              console.log(`id=${r.id}: parsed payload via fallback`);
            } catch (e2) {
              console.warn(`id=${r.id}: failed to parse payload, skipping`);
              continue;
            }
          }
        }

        payload.message = `Jadwal pemeliharaan dibuat untuk ${
          assetName || ""
        } (${assetAsetId || assetId})`;
        const newPayload = JSON.stringify(payload);

        await db
          .promise()
          .execute("UPDATE notification_logs SET payload = ? WHERE id = ?", [
            newPayload,
            r.id,
          ]);
        console.log(
          `Updated id=${r.id} -> message set to asset name (${assetName})`
        );
      } catch (e) {
        console.error(`Failed to update id=${r.id}:`, e.message || e);
      }
    }

    console.log("Done");
    process.exit(0);
  } catch (e) {
    console.error("Script failed:", e.message || e);
    process.exit(1);
  }
}

run();
