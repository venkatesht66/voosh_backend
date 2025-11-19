import express from "express";
import {
  startSession,
  listSessions,
  getSessionHistory,
  clearSession
} from "../controllers/sessionController.js";

const router = express.Router();

router.post("/start", startSession);
router.get("/list", listSessions);  
router.get("/history", getSessionHistory);
router.delete("/clear", clearSession);

export default router;