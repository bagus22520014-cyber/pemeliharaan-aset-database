import { getPendingApprovals } from "../routes/middleware/approval.js";

getPendingApprovals(null, (err, rows) => {
  if (err) {
    console.error("ERR:", err);
    process.exit(1);
  }
  console.log("ROWS:", rows.length);
  console.log(rows.slice(0, 10));
  process.exit(0);
});
