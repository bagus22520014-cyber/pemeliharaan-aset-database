import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

const username = "admin";
const password = "admin";
const role = "admin";

const qCheck = "SELECT * FROM user WHERE username = ?";
db.query(qCheck, [username], (err, res) => {
  if (err) {
    console.error("error checking user", err);
    process.exit(1);
  }
  if (res.length > 0) {
    console.log("admin user already exists");
    process.exit(0);
  }
  const qInsert =
    "INSERT INTO user (username, password, role) VALUES (?, ?, ?)";
  db.query(qInsert, [username, password, role], (err2, result) => {
    if (err2) {
      console.error("error inserting user", err2);
      process.exit(1);
    }
    console.log("inserted admin user id", result.insertId);
    process.exit(0);
  });
});
