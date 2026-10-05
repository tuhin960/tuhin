// FILE: backend/routes/intake.js
//
// POST /api/intake  (patient only)
// Takes the patient's problem in ANY language and returns a structured
// English medical summary for the doctor. The AI only translates and
// structures what the patient said â€” it never diagnoses.

import { Router } from "express";
import { verifyFirebaseToken, requireRole } from "../middleware/verifyFirebaseToken.js";

const router = Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const MAX_CHARS = 2000;

const SYSTEM_PROMPT = `You are a medical intake assistant inside the Swasth Setu telemedicine app.
A patient describes their problem in their own language (Bengali, Hindi, English, or a mix, possibly in Roman script).
Your job is ONLY to translate and structure what the patient said into concise English clinical language for a doctor.

Strict rules:
- Do NOT diagnose, suggest causes, or suggest treatment or medicines.
- Use only information the patient actually stated. If something is not mentioned, use an empty string or empty list. Never guess.
- Use standard medical terms where they clearly match the patient's words (e.g. "pet dard" -> "abdominal pain").
- "severity" must be one of: "mild", "moderate", "severe", "unspecified" (use the patient's own words as the basis).
- "redFlags" lists only urgent warning signs the patient explicitly described: chest pain, difficulty breathing, fainting/loss of consciousness, heavy bleeding, seizure, stroke signs (face droop, slurred speech, one-sided weakness), severe sudden headache, suicidal thoughts, coughing/vomiting blood. Otherwise an empty list.
- "language" is the language the patient wrote in (e.g. "Bengali", "Hindi", "English").
- Respond with JSON only.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    language: { type: "STRING" },
    chiefComplaint: { type: "STRING" },
    symptoms: { type: "ARRAY", items: { type: "STRING" } },
    duration: { type: "STRING" },
    severity: { type: "STRING", enum: ["mild", "moderate", "severe", "unspecified"] },
    redFlags: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["language", "chiefComplaint", "symptoms", "duration", "severity", "redFlags"],
};

router.post("/", verifyFirebaseToken, requireRole("patient"), async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Please describe your problem first." });
  }
  if (text.length > MAX_CHARS) {
    return res.status(400).json({ error: `Please keep it under ${MAX_CHARS} characters.` });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "AI intake is not configured (missing GEMINI_API_KEY)." });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: text.trim() }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.error("Gemini intake error:", await geminiRes.text());
      return res.status(502).json({ error: "AI service is unavailable right now. You can still send your request with your own words." });
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(502).json({ error: "AI couldn't summarize this. Try rephrasing." });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "AI returned an unreadable summary. Try again." });
    }

    // Sanitize â€” never trust the shape blindly.
    const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 12) : []);
    const summary = {
      chiefComplaint: String(parsed.chiefComplaint || "").slice(0, 300),
      symptoms: list(parsed.symptoms),
      duration: String(parsed.duration || "").slice(0, 100),
      severity: ["mild", "moderate", "severe", "unspecified"].includes(parsed.severity) ? parsed.severity : "unspecified",
      redFlags: list(parsed.redFlags),
    };

    res.json({
      language: String(parsed.language || "").slice(0, 40),
      summary,
      hasRedFlags: summary.redFlags.length > 0,
    });
  } catch (err) {
    console.error("Intake route error:", err);
    res.status(500).json({ error: "Something went wrong while preparing your summary." });
  }
});

export default router;
