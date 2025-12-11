import { logApprovalAction } from "../routes/middleware/approval.js";

logApprovalAction("disetujui", 38, "admin", 44, "aset", 44, null, (err) => {
  if (err) {
    console.error("Callback error:", err);
  } else {
    console.log("logApprovalAction finished");
  }
  process.exit(err ? 1 : 0);
});
