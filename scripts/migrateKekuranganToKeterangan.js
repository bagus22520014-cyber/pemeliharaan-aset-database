import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

// Copies non-null Kekurangan to Keterangan where Keterangan is null, then optionally drops Kekurangan column.

const copyQ = `UPDATE aset SET Keterangan = Kekurangan WHERE Kekurangan IS NOT NULL AND (Keterangan IS NULL OR Keterangan = '')`;
const dropQ = `ALTER TABLE aset DROP COLUMN Kekurangan`;

// Ensure Keterangan column exists
const ensureKeteranganQ = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aset' AND COLUMN_NAME = 'Keterangan'`;
db.query(ensureKeteranganQ, [process.env.DB_NAME], (errEnsure, rEnsure) => {
  if (errEnsure) {
    console.error("Error checking for Keterangan column:", errEnsure);
    process.exit(1);
  }
  if (!rEnsure || rEnsure.length === 0) {
    console.log("Keterangan column not found; adding it");
    db.query(`ALTER TABLE aset ADD COLUMN Keterangan TEXT NULL`, (errAdd) => {
      if (errAdd) {
        console.error("Error adding Keterangan column:", errAdd);
        process.exit(1);
      }
      proceedCopy();
    });
  } else {
    proceedCopy();
  }
});

function proceedCopy() {
  db.query(copyQ, (err, res) => {
    if (err) {
      console.error("Error copying Kekurangan to Keterangan:", err);
      process.exit(1);
    }
    console.log(
      "Copied Kekurangan to Keterangan rows count:",
      res.affectedRows || 0
    );

    // Warn and ask user if they want to drop the column (we cannot ask in script easily; we'll just perform it if env var DROP_KEKURANGAN=true)
    if (process.env.DROP_KEKURANGAN === "true") {
      // Verify column exists before attempting to drop.
      const checkQ = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aset' AND COLUMN_NAME = 'Kekurangan'`;
      db.query(checkQ, [process.env.DB_NAME], (errCheck, rowsCheck) => {
        if (errCheck) {
          console.error("Error checking for Kekurangan column:", errCheck);
          process.exit(1);
        }
        if (!rowsCheck || rowsCheck.length === 0) {
          console.log("Kekurangan column does not exist, nothing to drop.");
          process.exit(0);
        }
        db.query(dropQ, (err2) => {
          if (err2) {
            console.error("Error dropping Kekurangan column:", err2);
            process.exit(1);
          }
          console.log("Kekurangan column dropped successfully");
          process.exit(0);
        });
      });
    } else {
      console.log(
        "Kekurangan column left intact. Run again with DROP_KEKURANGAN=true to drop the column."
      );
      process.exit(0);
    }
  });
}
