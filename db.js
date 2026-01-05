import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env file relative to this module so scripts started from other
// working directories still pick up the correct DB_* values.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env"), override: false });

let connectionLimit = Number(process.env.DB_CONN_LIMIT || 15);
let queueLimit = Number(process.env.DB_QUEUE_LIMIT || 0);

// clamp sensible bounds to avoid misconfiguration
if (Number.isNaN(connectionLimit) || connectionLimit < 1) connectionLimit = 15;
if (connectionLimit > 100) connectionLimit = 100;
if (Number.isNaN(queueLimit) || queueLimit < 0) queueLimit = 0;
if (queueLimit > 1000) queueLimit = 1000;

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "pemeliharaan",
  waitForConnections: true,
  connectionLimit,
  queueLimit,
  // ensure dates are parsed consistently
  dateStrings: false,
});

console.log(
  `[db] pool configured host=${process.env.DB_HOST || "127.0.0.1"} db=${
    process.env.DB_NAME || "pemeliharaan"
  } connLimit=${connectionLimit} queueLimit=${queueLimit}`
);

export default db;
