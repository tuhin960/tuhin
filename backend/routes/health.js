// FILE: backend/routes/health.js

import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", service: "swasth-setu-backend" });
});

export default router;
