import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

// List of Beban values to seed user accounts for
const bebanList = [
  "MLM",
  "BJR-NET",
  "BNT-NET",
  "BTM-NET",
  "GTO-NET",
  "KDR-NET",
  "LMP-NET",
  "MLG-NET",
  "PDG-NET",
  "PKB-NET",
  "PKP-NET",
  "PLB-NET",
  "SBY-NET",
  "SMD-NET",
  "SRG-NET",
  "MLMKOB",
  "MLMMET",
  "MLMSDKB",
  "MLMSL",
  "BJR-MEDIA",
  "BNT-MEDIA",
  "BTM-MEDIA",
  "GTO-MEDIA",
  "KDR-MEDIA",
  "LMP-MEDIA",
  "MLG-MEDIA",
  "PDG-MEDIA",
  "PKB-MEDIA",
  "PKP-MEDIA",
  "PLB-MEDIA",
  "SBY-MEDIA",
  "SMD-MEDIA",
  "SRG-MEDIA",
];

function seed() {
  // We will create users with username 'user-<beban>' and default password 'user'.
  // role will be 'user' and Beban column will be set to the beban value.
  (function next(i) {
    if (i >= bebanList.length) {
      console.log("Seeding complete");
      process.exit(0);
    }
    const beban = bebanList[i];
    const username = `user-${beban}`.replace(/[^a-z0-9\-]/gi, "_");
    const password = "user";
    const role = "user";
    const checkQ = "SELECT * FROM user WHERE username = ?";
    db.query(checkQ, [username], (err, res) => {
      if (err) {
        console.error("Error checking user", username, err);
        process.exit(1);
      }
      if (res.length > 0) {
        console.log("User already exists:", username);
        next(i + 1);
        return;
      }
      const qInsert =
        "INSERT INTO user (username, nama, password, role, Beban) VALUES (?, ?, ?, ?, JSON_ARRAY(?))";
      db.query(
        qInsert,
        [username, username, password, role, beban],
        (err2, result) => {
          if (err2) {
            console.error("Error inserting user", username, err2);
            process.exit(1);
          }
          console.log("Inserted user", username, "id", result.insertId);
          next(i + 1);
        }
      );
    });
  })(0);
}

seed();
