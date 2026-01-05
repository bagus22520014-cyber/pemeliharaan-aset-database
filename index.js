import dotenv from "dotenv";
dotenv.config();

// Optionally silence all console output when env var `SILENCE_CONSOLE=true`
if (process.env.SILENCE_CONSOLE === "true") {
  try {
    const _noop = () => {};
  } catch (e) {
    // ignore
  }
}
// Re-enable console output
console.log = console._log || console.log;
console.info = console._info || console.info;
console.warn = console._warn || console.warn;
console.error = console._error || console.error;
console.debug = console._debug || console.debug;
console.table = console._table || console.table;
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import { rateLimiter } from "./routes/middleware/security.js";
import asetRouter from "./routes/aset.js";
import userRouter from "./routes/user.js";
import perbaikanRouter from "./routes/perbaikan.js";
import maintenanceRouter from "./routes/maintenance.js";
import riwayatRouter from "./routes/riwayat.js";
import notificationRouter from "./routes/notification.js";
import rusakRouter from "./routes/rusak.js";
import dipinjamRouter from "./routes/dipinjam.js";
import dijualRouter from "./routes/dijual.js";
import mutasiRouter from "./routes/mutasi.js";
import bebanRouter from "./routes/beban.js";
import departemenRouter from "./routes/departemen.js";
import approvalRouter from "./routes/approval.js";
import debugRouter from "./routes/debug.js";
import asetCopyRouter from "./routes/aset_copy.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
// allow cross-origin requests from other devices on the same network
// Configure CORS to allow frontend origin if provided
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (mobile apps, curl)
      if (!origin) return cb(null, true);
      // allow explicitly configured frontend origin
      if (origin === frontendOrigin) return cb(null, true);
      // allow any localhost origin (different dev ports like 5173/3000)
      try {
        const u = new URL(origin);
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1")
          return cb(null, true);
      } catch (e) {
        // fall through to rejection
      }
      return cb(new Error("CORS policy: origin not allowed"));
    },
    credentials: true,
  })
);

// global rate limiter (tunable via env RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS)
app.use(rateLimiter());
// ensure assets/imgs dir exists and serve static
const imgsDir = path.join(process.cwd(), "assets", "imgs");
if (!fs.existsSync(imgsDir)) fs.mkdirSync(imgsDir, { recursive: true });
app.use("/assets/imgs", express.static(imgsDir));

app.use((req, res, next) => {
  const role = req.headers["x-role"] || req.headers["role"] || "(none)";
  console.log(`[app] ${req.method} ${req.originalUrl} - x-role=${role}`);
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "pemeliharaan-aset-database API" });
});

// Compatibility: redirect old frontend calls like /maintenance_rules/:id -> /maintenance/rules/:id
app.use((req, res, next) => {
  if (req.path && req.path.startsWith("/maintenance_rules")) {
    const newPath = req.path.replace(
      "/maintenance_rules",
      "/maintenance/rules"
    );
    const search =
      req.url && req.url.includes("?")
        ? req.url.slice(req.url.indexOf("?"))
        : "";
    const dest = newPath + search;
    return res.redirect(307, dest);
  }
  return next();
});

app.use("/aset", asetRouter);
app.use("/user", userRouter);
app.use("/perbaikan", perbaikanRouter);
app.use("/maintenance", maintenanceRouter);
app.use("/riwayat", riwayatRouter);
app.use("/notification", notificationRouter);
app.use("/rusak", rusakRouter);
app.use("/dipinjam", dipinjamRouter);
app.use("/dijual", dijualRouter);
app.use("/mutasi", mutasiRouter);
app.use("/beban", bebanRouter);
app.use("/departemen", departemenRouter);
app.use("/approval", approvalRouter);
app.use("/debug", debugRouter);
app.use("/aset_copy", asetCopyRouter);

function printRoutes(app) {
  try {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods)
          .map((m) => m.toUpperCase())
          .join(",");
        routes.push(`${methods} ${middleware.route.path}`);
      } else if (middleware.name === "router") {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods)
              .map((m) => m.toUpperCase())
              .join(",");
            routes.push(
              `${methods} ${middleware.regexp} -> ${handler.route.path}`
            );
          }
        });
      }
    });
    console.log("Registered routes: \n" + routes.join("\n"));
  } catch (err) {
    console.warn("Could not print routes:", err?.message ?? err);
  }
}

printRoutes(app);

function printRouterDetails(basePath, router) {
  try {
    const lines = [];
    router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .map((m) => m.toUpperCase())
          .join(",");
        lines.push(`${methods} ${basePath}${layer.route.path}`);
      }
    });
    console.log(`Routes under ${basePath}:\n` + lines.join("\n"));
  } catch (err) {
    console.warn(
      `Could not print router details for ${basePath}:`,
      err?.message ?? err
    );
  }
}

printRouterDetails("/aset", asetRouter);
printRouterDetails("/perbaikan", perbaikanRouter);
printRouterDetails("/user", userRouter);
printRouterDetails("/riwayat", riwayatRouter);
printRouterDetails("/notification", notificationRouter);
printRouterDetails("/aset_copy", asetCopyRouter);

// Error handler to log stack traces for debugging during development
app.use((err, req, res, next) => {
  try {
    console.error("Express error:", err && err.stack ? err.stack : err);
  } catch (e) {
    console.error("Error while logging error:", e);
  }
  if (res.headersSent) return next(err);
  return res.status(500).json({ message: "Internal error" });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.stack ?? err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const port = process.env.PORT ?? 4000;
const host = process.env.HOST ?? "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
});

export default app;
