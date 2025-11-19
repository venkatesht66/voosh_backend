import { Router } from "express";
import { chat, getHistory, clearChatSession } from "../controllers/chatController.js";

const router = Router();

router.post("/", chat);
router.get("/history", getHistory);
router.delete("/clear", clearChatSession);

export default router;