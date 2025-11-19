import { Router } from "express";
import { ingestArticles } from "../controllers/ingestController.js";

const router = Router();

router.post("/", ingestArticles);

export default router;