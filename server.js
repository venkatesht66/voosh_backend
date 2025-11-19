import dotenv from "dotenv";
import express from "express";
import { initQdrant } from "./src/services/qdrantService.js";
import cors from "cors";
import chatRoutes from "./src/routes/chatRoutes.js";
import ingestRoutes from "./src/routes/ingestRoutes.js";
import "./src/services/mongoService.js";
import sessionRoutes from "./src/routes/sessionRoutes.js";
import { warmupCache } from "./src/services/cacheWarm.js"; 

const app = express();
dotenv.config();
initQdrant();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/api/chat", chatRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/session", sessionRoutes);

const PORT = process.env.PORT || 4000;

(async () => {
  await warmupCache();
})();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});