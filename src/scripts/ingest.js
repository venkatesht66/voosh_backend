import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

console.log("QDRANT_URL:", process.env.QDRANT_URL);
console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY);
console.log("Collection:", process.env.QDRANT_COLLECTION);

const repoRoot = path.resolve(process.cwd(), "..", "..");
const defaultArticlesDir = path.join(repoRoot, "ingestion", "articles");

const ARTICLES_DIR = process.env.ARTICLES_DIR || defaultArticlesDir;

import { embedText } from "../../src/services/jinaService.js";
import { qdrantClient } from "../../src/services/qdrantService.js";

const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 200);

async function ingest() {
  try {
    if (!process.env.JINA_API_KEY) {
      console.error("Missing JINA_API_KEY in environment — aborting ingestion.");
      process.exit(1);
    }
    if (!process.env.QDRANT_URL) {
      console.error("Missing QDRANT_URL in environment — aborting ingestion.");
      process.exit(1);
    }
    if (!process.env.QDRANT_COLLECTION) {
      console.error("Missing QDRANT_COLLECTION in environment — aborting ingestion.");
      process.exit(1);
    }

    if (!fs.existsSync(ARTICLES_DIR)) {
      throw new Error(`Articles directory not found: ${ARTICLES_DIR}`);
    }

    const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith(".json") || f.endsWith(".txt"));
    console.log("Found", files.length, "files in", ARTICLES_DIR);

    let points = [];
    let totalPoints = 0;

    for (const file of files) {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
      let text = raw;
      let title = null, url = null, authors = null;

      try {
        const parsed = JSON.parse(raw);
        text = parsed.maintext || parsed.summary || parsed.content || parsed.text || JSON.stringify(parsed);
        title = parsed.title || null;
        url = parsed.url || null;
        authors = parsed.authors || null;
      } catch (e) {
        text = raw;
      }
      const paragraphs = text.split(/\n{1,}/).map(s => s.trim()).filter(s => s.length > 40);

      console.log(`Processing ${file} → ${paragraphs.length} chunks`);

      for (const p of paragraphs) {
        try {
          const vector = await embedText(p);
          if (!vector || !Array.isArray(vector) || vector.length === 0) {
            console.warn("Skipping empty embedding for chunk (short):", p.slice(0, 80));
            continue;
          }
          const point = {
            id: uuidv4(),
            vector,
            payload: {
              sourceFile: file,
              chunk: p,
              title,
              url,
              authors,
              createdAt: new Date().toISOString()
            }
          };
          points.push(point);
          totalPoints++;
        } catch (err) {
          console.error("Embedding error for chunk (skipping):", err.message || err);
        }

        if (points.length >= BATCH_SIZE) {
          console.log(`Uploading batch of ${points.length} points to Qdrant...`);
          await qdrantClient.upsert(process.env.QDRANT_COLLECTION, {
            wait: true,
            points
          });
          points = [];
        }
      }
    }

    if (points.length > 0) {
      console.log(`Uploading final batch of ${points.length} points to Qdrant...`);
      await qdrantClient.upsert(process.env.QDRANT_COLLECTION, {
        wait: true,
        points
      });
    }

    console.log(`Ingestion complete. Total points uploaded: ${totalPoints}`);
    process.exit(0);
  } catch (err) {
    console.error("Ingestion failed:", err);
    process.exit(1);
  }
}

ingest();