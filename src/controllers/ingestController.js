import axios from "axios";
import { chunkText } from "../utils/chunker.js";
import { embedText } from "../services/jinaService.js";
import { qdrantClient } from "../services/qdrantService.js";

export const ingestArticles = async (req, res) => {
  try {
    const { articles } = req.body;

    let points = [];

    for (const article of articles) {
      const chunks = chunkText(article.content);

      for (const chunk of chunks) {
        const vector = await embedText(chunk);

        points.push({
          vector,
          payload: {
            title: article.title,
            url: article.url,
            chunk
          }
        });
      }
    }

    await qdrantClient.upsert(process.env.QDRANT_COLLECTION, { points });

    res.json({ message: "Ingestion complete", count: points.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};