// FILE: backend/routes/referralEngine.js
//
// Feature 1 — Smart Referral Engine.
// This is exactly the kind of logic the architecture doc calls out for
// the Node.js side of the hybrid: multi-factor facility matching that's
// easier to iterate on outside a Cloud Function, called by Doctor's
// "Refer Patient" page.
//
// DEMO DATA ONLY (RULE 3) — facilities below are simulated. Replace
// `DEMO_FACILITIES` with a Firestore read (adminDb.collection('facilities'))
// once real facility resource documents exist.

import { Router } from "express";
import { verifyFirebaseToken, requireRole } from "../middleware/verifyFirebaseToken.js";

const router = Router();

const DEMO_FACILITIES = [
  {
    id: "FAC-2026-1001",
    name: "District Hospital, Howrah",
    departments: ["cardiology", "general-medicine", "orthopedics"],
    icuBedsAvailable: 2,
    generalBedsAvailable: 24,
    diagnostics: ["ecg", "ct-scan", "blood-panel"],
    distanceKm: 18,
    lastUpdatedMinutesAgo: 8,
    operational: true,
  },
  {
    id: "FAC-2026-1002",
    name: "PHC Domjur",
    departments: ["general-medicine"],
    icuBedsAvailable: 0,
    generalBedsAvailable: 6,
    diagnostics: ["blood-panel"],
    distanceKm: 6,
    lastUpdatedMinutesAgo: 340,
    operational: true,
  },
  {
    id: "FAC-2026-1003",
    name: "Sub-Divisional Hospital, Uluberia",
    departments: ["cardiology", "general-medicine", "pediatrics"],
    icuBedsAvailable: 1,
    generalBedsAvailable: 12,
    diagnostics: ["ecg", "blood-panel"],
    distanceKm: 27,
    lastUpdatedMinutesAgo: 15,
    operational: true,
  },
];

const FRESHNESS_STALE_AFTER_MIN = 60;

function scoreFacility(facility, requirement) {
  const reasons = [];
  let score = 0;

  const hasDept = facility.departments.includes(requirement.department);
  if (hasDept) { score += 30; reasons.push({ ok: true, text: `${requirement.department} available` }); }
  else { reasons.push({ ok: false, text: `${requirement.department} not available` }); }

  const bedsNeeded = requirement.urgency === "emergency" ? facility.icuBedsAvailable : facility.generalBedsAvailable;
  const bedLabel = requirement.urgency === "emergency" ? "ICU beds available" : "General beds available";
  if (bedsNeeded > 0) { score += 25; reasons.push({ ok: true, text: bedLabel }); }
  else { reasons.push({ ok: false, text: `No ${bedLabel.toLowerCase()}` }); }

  const hasDiagnostics = (requirement.diagnostics || []).every((d) => facility.diagnostics.includes(d));
  if (hasDiagnostics) { score += 15; reasons.push({ ok: true, text: "Required diagnostic capability available" }); }
  else { reasons.push({ ok: false, text: "Missing one or more required diagnostics" }); }

  const isFresh = facility.lastUpdatedMinutesAgo <= FRESHNESS_STALE_AFTER_MIN;
  if (isFresh) { score += 15; reasons.push({ ok: true, text: "Facility status updated recently" }); }
  else { reasons.push({ ok: false, text: `Data is ${facility.lastUpdatedMinutesAgo} min old — verify before relying on it` }); }

  if (facility.distanceKm <= 30) { score += 15; reasons.push({ ok: true, text: "Estimated travel distance acceptable" }); }
  else { reasons.push({ ok: false, text: "Travel distance is significant" }); }

  return { score, reasons };
}

// POST /api/referral-engine/match
// body: { department, urgency: "emergency"|"urgent"|"normal", diagnostics: string[] }
router.post("/match", verifyFirebaseToken, requireRole("doctor", "healthworker"), (req, res) => {
  const requirement = req.body || {};
  if (!requirement.department) {
    return res.status(400).json({ error: "requirement.department is required" });
  }

  const ranked = DEMO_FACILITIES
    .filter((f) => f.operational)
    .map((f) => {
      const { score, reasons } = scoreFacility(f, requirement);
      return {
        facilityId: f.id,
        facilityName: f.name,
        score,
        reasons,
        dataFreshness: f.lastUpdatedMinutesAgo <= FRESHNESS_STALE_AFTER_MIN ? "fresh" : "stale",
        demoData: true,
      };
    })
    .sort((a, b) => b.score - a.score);

  res.json({ requirement, recommendations: ranked, note: "Simulated facility data — SIH demo only." });
});

export default router;
