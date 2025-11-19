import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "news_articles";

if (!QDRANT_URL) {
  console.warn("Warning: QDRANT_URL not set. Qdrant client may fail to connect.");
}

export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false
});


export const initQdrant = async () => {
  try {
    const collections = await qdrantClient.getCollections();
    const existingCollections = (collections?.collections || []).map(c => c.name);

    if (!existingCollections.includes(QDRANT_COLLECTION)) {
      console.log("Creating Qdrant collection:", QDRANT_COLLECTION);
      await qdrantClient.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: 768,
          distance: "Cosine"
        }
      });
      console.log("Collection created successfully!");
    } else {
      console.log("Qdrant collection already exists:", QDRANT_COLLECTION);
    }
  } catch (err) {
    console.error("Qdrant init error:", err?.message || err);
    throw err;
  }
};

/**
 * Search Qdrant for nearest neighbors
 * @param {number[]} vector - embedding vector
 * @param {number} limit - top-k
 * @returns array of hits with payload
 */

export const searchQdrant = async (vector, limit = 5) => {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Invalid vector for Qdrant search");
  }
  try {
    const res = await qdrantClient.search(QDRANT_COLLECTION, {
      vector,
      limit,
      with_payload: true
    });
    return res.result || [];
  } catch (err) {
    console.error("Qdrant search error:", err?.message || err);
    return [];
  }
};

/**
 * Upsert points in batches to Qdrant
 * @param {Array} points - each point { id?: string|number, vector: number[], payload: {} }
 * @param {number} batchSize - batch size to avoid huge payloads
 */

export const upsertPoints = async (points, batchSize = 200) => {
  if (!Array.isArray(points)) throw new Error("Points must be an array");

  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    try {
      await qdrantClient.upsert(QDRANT_COLLECTION, {
        points: batch
      });
      console.log(`Upserted batch ${i} - ${i + batch.length}`);
    } catch (err) {
      console.error(`Qdrant upsert error for batch ${i}-${i + batch.length}:`, err?.message || err);
      throw err;
    }
  }
  return { upserted: points.length };
};