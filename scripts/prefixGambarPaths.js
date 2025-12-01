import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

// This script updates existing aset.Gambar values that are not full path
// It prefixes them with '/assets/imgs/' if they don't already start with it.

const q = "SELECT id, Gambar FROM aset WHERE Gambar IS NOT NULL";

db.query(q, (err, rows) => {
  if (err) {
    console.error("Error selecting aset rows:", err);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log("No aset rows with Gambar found. Nothing to update.");
    process.exit(0);
  }
  let updates = 0;
  rows.forEach((r) => {
    const g = r.Gambar || "";
    if (!g.startsWith("/assets/imgs/")) {
      const newG = "/assets/imgs/" + g;
      db.query(
        "UPDATE aset SET Gambar = ? WHERE id = ?",
        [newG, r.id],
        (err2) => {
          if (err2) console.error("Error updating id", r.id, err2);
          else {
            updates++;
            console.log("Updated id", r.id, "Gambar ->", newG);
          }
        }
      );
    }
  });
  setTimeout(() => {
    console.log("Done. Total updated:", updates);
    process.exit(0);
  }, 2000);
});
