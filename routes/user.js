import express from "express";
import db from "../db.js";
import { requireAdmin } from "./middleware/auth.js";

const router = express.Router();

const loginHandler = (req, res) => {
  const { username, password } = req.body;

  const q = "SELECT * FROM user WHERE username = ? AND password = ?";
  db.query(q, [username, password], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: "Login gagal" });
    }

    const user = result[0];
    console.log(
      `login success: ${user.username ?? user.Username} (role=${user.role})`
    );
    // Set a cookie with the user's role to persist auth between requests
    const role = (user.role ?? "").toString().trim().toLowerCase();
    // Persist role and beban in cookies for 1 day so subsequent requests automatically authenticate
    const beban = (user.Beban ?? user.beban ?? "").toString().trim();
    res.cookie("role", role, { sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 });
    if (beban !== "") {
      res.cookie("beban", beban, {
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    res.json({
      message: "Login berhasil",
      role,
      beban: beban || null,
      username: user.username ?? user.Username ?? null,
      id: user.id ?? user.Id ?? null,
    });
  });
};

// Accept login on both POST /user and POST /user/login for backward compatibility
router.post("/login", loginHandler);
router.post("/", loginHandler);

// GET all users (omits sensitive fields) (admin only)
router.get("/", requireAdmin, (req, res) => {
  // Select typical public fields; avoid returning passwords
  const q = "SELECT username, role FROM user";
  db.query(q, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

export default router;
