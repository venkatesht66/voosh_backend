
import axios from "axios";
import "dotenv/config";

const JINA_API_KEY = process.env.JINA_API_KEY;
if (!JINA_API_KEY) {
  console.warn("Warning: JINA_API_KEY is not set. Embeddings will fail if called.");
}

const RETRIES = 3;
const BACKOFF_BASE_MS = 300;

const retry = async (fn, attempts = RETRIES) => {
  try {
    return await fn();
  } catch (err) {
    if (attempts <= 1) throw err;
    const wait = BACKOFF_BASE_MS * Math.pow(2, RETRIES - attempts);
    await new Promise((r) => setTimeout(r, wait));
    return retry(fn, attempts - 1);
  }
};

export const embedText = async (text) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("Text is empty or invalid for embedding");
  }
  if (!JINA_API_KEY) {
    throw new Error("Missing JINA_API_KEY in environment");
  }

  return retry(async () => {
    try {
      const response = await axios.post(
        "https://api.jina.ai/v1/embeddings",
        {
          model: "jina-embeddings-v2-base-en",
          input: text
        },
        {
          headers: {
            Authorization: `Bearer ${JINA_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 3000000
        }
      );

      const emb = response?.data?.data?.[0]?.embedding;
      if (!emb || !Array.isArray(emb)) {
        console.error("Unexpected Jina response shape:", response.data);
        throw new Error("Embedding response malformed");
      }
      return emb;
    } catch (err) {
      const msg = err.response?.data || err.message || String(err);
      console.error("Jina embedding error:", msg);
      throw new Error("Embedding failed: " + (msg?.message || msg));
    }
  });
};