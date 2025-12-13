import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Checking perbaikan table column types...");

db.query("DESCRIBE perbaikan", (err, cols) => {
  if (err) {
    console.error("Error describing perbaikan table:", err);
    process.exit(1);
  }

  const colMap = {};
  cols.forEach((c) => (colMap[c.Field] = c.Type.toLowerCase()));

  const targetColumn = colMap["biaya"]
    ? "biaya"
    : colMap["nominal"]
    ? "nominal"
    : null;
  if (!targetColumn) {
    console.error(
      "No 'biaya' or 'nominal' column found in perbaikan table. Aborting."
    );
    process.exit(1);
  }

  const colType = colMap[targetColumn];
  console.log(`Found column '${targetColumn}' with type '${colType}'`);

  if (
    !colType.includes("decimal") &&
    !colType.includes("numeric") &&
    !colType.includes("float")
  ) {
    console.log(
      `Column '${targetColumn}' does not appear to be decimal; no action needed.`
    );
    process.exit(0);
  }

  // Round existing values to integer (in-place) before altering type
  console.log(
    `Rounding values in ${targetColumn} and altering column to INT...`
  );

  db.query(
    `UPDATE perbaikan SET ${targetColumn} = ROUND(${targetColumn}) WHERE ${targetColumn} IS NOT NULL`,
    (errUpd) => {
      if (errUpd) {
        console.error(`Error rounding ${targetColumn}:`, errUpd);
        process.exit(1);
      }

      const alterQ = `ALTER TABLE perbaikan MODIFY ${targetColumn} INT DEFAULT 0`;
      db.query(alterQ, (errAlt) => {
        if (errAlt) {
          console.error(
            `Error altering column ${targetColumn} to INT:`,
            errAlt
          );
          process.exit(1);
        }
        console.log(`Successfully converted ${targetColumn} to INT.`);
        process.exit(0);
      });
    }
  );
});

// safety net
setTimeout(() => process.exit(0), 10_000);
