// FILE: backend/server.js
//
// Hybrid backend: Firebase Auth/Firestore remain the source of truth
// for identity and core data. This Express server only hosts the extra
// APIs that don't fit cleanly as Cloud Functions for this team right
// now (Smart Referral Engine + the Gemini chatbot proxy + AI intake).

import "dotenv/config";
import express from "express";
import cors from "cors";

import healthRoutes from "./routes/health.js";
import referralEngineRoutes from "./routes/referralEngine.js";
import chatbotRoutes from "./routes/chatbot.js";
import intakeRoutes from "./routes/intake.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/referral-engine", referralEngineRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/intake", intakeRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Swasth Setu backend running on http://localhost:${PORT}`);
});
