// FILE: backend/config/firebaseAdmin.js
//
// Hybrid setup: Firebase stays the source of truth for identity
// (Auth) and core data (Firestore). This Node.js server verifies the
// same Firebase ID tokens the frontend already gets from firebase/auth.js,
// so there is exactly ONE identity system, not two.
//
// Download a service-account key from:
//   Firebase Console > Project Settings > Service Accounts > Generate new private key
// Save it as config/serviceAccountKey.json (already .gitignored).

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./config/serviceAccountKey.json";

let app;
try {
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));
  app = initializeApp({ credential: cert(serviceAccount) });
} catch (err) {
  console.warn(
    `[firebaseAdmin] Could not load service account at "${keyPath}". ` +
    `Using default initialization with projectId for token verification. (${err.message})`
  );
  // For the prototype, provide the projectId from frontend config to allow verifyIdToken to work
  app = initializeApp({ projectId: "claude-cf628" }); 
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
