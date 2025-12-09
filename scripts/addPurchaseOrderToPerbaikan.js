import db from "../db.js";

console.log("Adding PurchaseOrder column to perbaikan table...");

const addColumnQuery = `
  ALTER TABLE perbaikan 
  ADD COLUMN PurchaseOrder VARCHAR(100) NULL AFTER teknisi
`;

db.query(addColumnQuery, (err) => {
  if (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("⚠️  Column PurchaseOrder already exists in perbaikan table");
    } else {
      console.error("❌ Error adding PurchaseOrder column:", err);
    }
  } else {
    console.log(
      "✅ Successfully added PurchaseOrder column to perbaikan table"
    );
  }
  db.end();
});
