// FILE: backend/middleware/verifyFirebaseToken.js
//
// Every protected Node route expects: Authorization: Bearer <Firebase ID token>
// (the frontend gets this token from `firebaseUser.getIdToken()`).
// This mirrors ProtectedRoute.jsx on the frontend, but as a server-side
// gate for the extra Node.js APIs — role/specialId come from the same
// Firestore users/{uid} document described in Section 8.

import { adminAuth, adminDb } from "../config/firebaseAdmin.js";

export async function verifyFirebaseToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization: Bearer <token> header." });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const profileSnap = await adminDb.collection("users").doc(decoded.uid).get();

    if (!profileSnap.exists) {
      return res.status(403).json({ error: "No Firestore profile for this account." });
    }

    req.user = { uid: decoded.uid, ...profileSnap.data() };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized for this action." });
    }
    next();
  };
}
