// FILE: backend/routes/chatbot.js
//
// Proxies chat requests to Google Gemini — the API key lives only
// here, server-side, and is never sent to the browser. The system
// prompt keeps replies to general health information, never a
// diagnosis, and always points toward a real consultation.

import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";

const router = Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const SYSTEM_PROMPT = `You are "Setu", a friendly health-information assistant inside the Swasth Setu app.
Rules you must always follow:
- Give general health information only. Never diagnose a condition or tell someone what illness they have.
- Never prescribe or recommend specific medicine names, dosages, or drug combinations.
- For anything urgent-sounding (chest pain, breathing trouble, heavy bleeding, loss of consciousness, thoughts of self-harm), tell the person to use the app's Emergency Help button or call local emergency services immediately.
- Always end with a short reminder to confirm anything important with a real doctor through the app's consultation feature.
- Keep answers short (3-5 sentences) and in simple language.`;

router.post("/", verifyFirebaseToken, async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Chatbot is not configured (missing GEMINI_API_KEY)." });
  }

  const contents = [
    ...(Array.isArray(history) ? history : [])
      .filter((h, i) => !(i === 0 && h.role === "assistant"))
      .map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Gemini API error:", errBody);
      return res.status(502).json({ error: "Chatbot service is unavailable right now." });
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't come up with a response. Please try rephrasing.";

    res.json({ reply });
  } catch (err) {
    console.error("Chatbot route error:", err);
    res.status(500).json({ error: "Something went wrong talking to the chatbot." });
  }
});

export default router;