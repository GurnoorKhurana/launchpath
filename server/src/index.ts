import "dotenv/config";
import express from "express";
import cors from "cors";
import { tailorHandler } from "./routes/tailor.ts";
import { careerChatHandler } from "./routes/careerChat.ts";

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post("/api/tailor", tailorHandler);
app.post("/api/career-chat", careerChatHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[launchpath-server] listening on http://localhost:${port}`);
  });
}

export { app };
