import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

const sampleUsers = [
  {
    username: "admin",
    nama: "Admin",
    password: "admin123",
    role: "admin",
    beban: ["MLM"],
  },
  {
    username: "bagus",
    nama: "Bagus",
    password: "user123",
    role: "user",
    beban: ["MLG-NET", "MLG-MEDIA"],
  },
  {
    username: "andi",
    nama: "Andi",
    password: "user123",
    role: "user",
    beban: ["SBY-NET"],
  },
  {
    username: "sari",
    nama: "Sari",
    password: "user123",
    role: "user",
    beban: ["PKB-NET", "PKB-MEDIA", "MLM"],
  },
];

function insertUser(u) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM user WHERE username = ?",
      [u.username],
      (err, rows) => {
        if (err) return reject(err);
        if (rows && rows.length > 0) {
          console.log("User exists, skipping:", u.username);
          return resolve();
        }
        // Build JSON_ARRAY placeholders depending on beban length
        const placeholders = u.beban.map(() => "?").join(",");
        const q = `INSERT INTO user (username, nama, password, role, Beban) VALUES (?, ?, ?, ?, JSON_ARRAY(${placeholders}))`;
        const params = [
          u.username,
          u.nama ?? u.username,
          u.password,
          u.role,
          ...u.beban,
        ];
        db.query(q, params, (err2, res) => {
          if (err2) return reject(err2);
          console.log("Inserted user", u.username, res.insertId);
          resolve();
        });
      }
    );
  });
}

(async function seed() {
  try {
    for (const u of sampleUsers) {
      await insertUser(u);
    }
    console.log("Sample users seeded");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding sample users:", err);
    process.exit(1);
  }
})();
