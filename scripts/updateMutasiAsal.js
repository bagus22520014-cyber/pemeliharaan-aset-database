import dotenv from "dotenv";
dotenv.config();
import db from "../db.js";

console.log("=== Update Mutasi: Auto-populate Asal from Aset ===\n");

// Step 1: Update existing mutasi records - populate departemen_asal and ruangan_asal from aset
console.log(
  "Step 1: Populating departemen_asal and ruangan_asal from aset for existing records..."
);

const updateQuery = `
  UPDATE mutasi m
  JOIN aset a ON m.aset_id = a.id
  SET 
    m.departemen_asal_id = COALESCE(m.departemen_asal_id, a.departemen_id),
    m.ruangan_asal = COALESCE(m.ruangan_asal, a.Lokasi)
  WHERE m.departemen_asal_id IS NULL OR m.ruangan_asal IS NULL
`;

db.query(updateQuery, (err, result) => {
  if (err) {
    console.error("❌ Error updating mutasi records:", err.message);
    db.end();
    return;
  }

  console.log(
    `✅ Updated ${result.affectedRows} mutasi records with asal data from aset`
  );

  // Step 2: Verify the update
  console.log("\nStep 2: Verifying updated records...");
  db.query("SELECT COUNT(*) as total FROM mutasi", (err2, countResult) => {
    if (err2) {
      console.error("❌ Error counting mutasi:", err2.message);
      db.end();
      return;
    }

    console.log(`✅ Total mutasi records: ${countResult[0].total}`);

    db.query(
      "SELECT COUNT(*) as filled FROM mutasi WHERE departemen_asal_id IS NOT NULL AND ruangan_asal IS NOT NULL",
      (err3, filledResult) => {
        if (err3) {
          console.error("❌ Error checking filled records:", err3.message);
          db.end();
          return;
        }

        console.log(
          `✅ Records with both asal fields populated: ${filledResult[0].filled}`
        );

        console.log("\n=== Update Complete ===");
        console.log(
          "Note: New mutasi records will auto-populate asal fields from aset in the route handler"
        );

        db.end();
      }
    );
  });
});
