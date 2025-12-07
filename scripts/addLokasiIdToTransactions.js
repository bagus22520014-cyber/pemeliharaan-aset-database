import db from "../db.js";

console.log("[Migration] Adding lokasi_id column to transaction tables...");

const tables = [
  { name: "perbaikan", description: "Repairs" },
  { name: "rusak", description: "Damaged items" },
  { name: "dipinjam", description: "Borrowed items" },
  { name: "dijual", description: "Sold items" },
];

let completed = 0;

tables.forEach((table) => {
  // Check if column exists
  const checkQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = '${table.name}' 
    AND COLUMN_NAME = 'lokasi_id'
  `;

  db.query(checkQuery, (err, rows) => {
    if (err) {
      console.error(`[${table.name}] Error checking column:`, err);
      checkComplete();
      return;
    }

    if (rows && rows.length > 0) {
      console.log(`[${table.name}] lokasi_id column already exists`);
      checkComplete();
      return;
    }

    // Add lokasi_id column
    const alterQuery = `
      ALTER TABLE ${table.name} 
      ADD COLUMN lokasi_id INT NULL,
      ADD CONSTRAINT fk_${table.name}_lokasi 
        FOREIGN KEY (lokasi_id) 
        REFERENCES aset_lokasi(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
    `;

    db.query(alterQuery, (err2) => {
      if (err2) {
        console.error(`[${table.name}] Error adding lokasi_id:`, err2);
      } else {
        console.log(`[${table.name}] ✓ lokasi_id column added successfully`);
      }
      checkComplete();
    });
  });
});

function checkComplete() {
  completed++;
  if (completed === tables.length) {
    console.log("\n[Migration] Complete! All tables updated.");
    process.exit(0);
  }
}
