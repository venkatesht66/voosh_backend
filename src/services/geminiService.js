import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Gemini calls will fail.");
}
const genAI = new GoogleGenerativeAI(API_KEY);

const RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

const retry = async (fn, attempts = RETRIES) => {
  try {
    return await fn();
  } catch (err) {
    const shouldRetry =
      err?.status === 429 || err?.status === 503 || /overloaded|rate/i.test(err?.message || "");
    if (!shouldRetry || attempts <= 1) throw err;
    const wait = BACKOFF_BASE_MS * Math.pow(2, RETRIES - attempts);
    console.log(`Gemini retry in ${wait}ms (attempts left: ${attempts - 1})`);
    await new Promise((r) => setTimeout(r, wait));
    return retry(fn, attempts - 1);
  }
};


export const generateAnswer = async (context, question) => {
  const prompt = `
Use only the context below to answer the question:

Context:
${context}

Question:
${question}
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContentStream(prompt);

    let fullText = "";
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) fullText += t;
    }

    return fullText;

  } catch (err) {
    console.error("Gemini Error:", err);
    return "⚠️ Gemini is currently overloaded. Please try again in a moment.";
  }
};