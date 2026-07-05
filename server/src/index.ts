import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import { tailorHandler } from "./routes/tailor.ts";
import { careerPathsHandler } from "./routes/careerPaths.ts";
import { aiGuard } from "./lib/guard.ts";

const app = express();
app.set("trust proxy", 1); // real client IPs behind Render/Fly proxy
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post("/api/tailor", aiGuard, tailorHandler);
app.post("/api/career-paths", aiGuard, careerPathsHandler);

// Production: serve the built client from this same server (one host, no CORS).
// Set CLIENT_DIST=../client/dist (relative to server/) on the deploy host.
const clientDist = process.env.CLIENT_DIST;
if (clientDist) {
  const dist = path.resolve(clientDist);
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[launchpath-server] listening on http://localhost:${port}`);
  });
}

export { app };
