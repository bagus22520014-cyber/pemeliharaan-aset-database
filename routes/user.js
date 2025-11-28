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
    const role = (user.role ?? "").toString().trim().toLowerCase();
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

router.post("/login", loginHandler);
router.post("/", loginHandler);

router.get("/", requireAdmin, (req, res) => {
  const q = "SELECT username, role FROM user";
  db.query(q, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

export default router;
