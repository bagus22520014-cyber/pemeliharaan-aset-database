import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import asetRouter from "./routes/aset.js";
import userRouter from "./routes/user.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const role = req.headers["x-role"] || req.headers["role"] || "(none)";
  console.log(`[app] ${req.method} ${req.originalUrl} - x-role=${role}`);
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "pemeliharaan-aset-database API" });
});

app.use("/aset", asetRouter);
app.use("/user", userRouter);

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

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.stack ?? err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
