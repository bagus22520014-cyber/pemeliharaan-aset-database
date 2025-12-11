import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Migrating notification.related_aset_id to store AsetId...");

// 1. Alter table: change related_aset_id to AsetId (varchar(50)), and set as foreign key if possible
const alterSQL = `ALTER TABLE notification 
  CHANGE COLUMN related_aset_id AsetId VARCHAR(50) DEFAULT NULL, 
  ADD INDEX idx_AsetId (AsetId)`;

db.query(alterSQL, (err) => {
  if (err) {
    console.error("Error altering notification table:", err);
    process.exit(1);
  }
  console.log("Table 'notification' altered: related_aset_id -> AsetId");
  process.exit(0);
});
