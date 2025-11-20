import { embedText } from "../services/jinaService.js";
import { searchQdrant } from "../services/qdrantService.js";
import { generateAnswer } from "../services/geminiService.js";
import client from "../services/redisService.js";
import Session from "../models/Session.js";
import Transcript from "../models/Transcript.js";

export const chat = async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(422).json({ error: "Missing sessionId or message" });
    }

    console.log("Embedding...");
    const userVector = await embedText(message);

    console.log("Searching Qdrant...");
    const TOP_K = Number(process.env.QDRANT_TOP_K || 5);
    const results = await searchQdrant(userVector, TOP_K);

    console.log("Generating context...");
    let context = results
      .map((r, idx) => `[${idx + 1}] ${r.payload?.chunk || ""} (Source: ${r.payload?.sourceFile || "unknown"})`)
      .join("\n\n");
      
    if (!context.trim()) {
      context = "";
    }

    console.log("Generating answer...");
    const answer = await generateAnswer(context, message);

    const normalizeAnswer = (a) => {
      if (!a) return "";
      if (typeof a === "string") {
        try {
          const parsed = JSON.parse(a);
          if (parsed && typeof parsed === "object" && (parsed.answer || parsed.answerText || parsed.text)) {
            return parsed.answer || parsed.answerText || parsed.text;
          }
        } catch { /* not JSON */ }
        return a;
      }
      if (typeof a === "object") {
        return a.answer || a.answerText || a.text || JSON.stringify(a);
      }
      return String(a);
    };

    const assistantContent = normalizeAnswer(answer);

    await client.rPush(
      `session:${sessionId}`,
      JSON.stringify({ role: "user", content: message, ts: new Date().toISOString() })
    );

    await client.rPush(
      `session:${sessionId}`,
      JSON.stringify({ role: "assistant", content: assistantContent, ts: new Date().toISOString() })
    );

    await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: message, ts: new Date() },
              { role: "assistant", content: assistantContent, ts: new Date() }
            ]
          }
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    return res.status(200).json({ answer: assistantContent });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: `Chat failed: ${err.message}` });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const history = await client.lRange(`session:${sessionId}`, 0, -1);

    return res.json(history.map(JSON.parse));

  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const clearChatSession = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const history = await client.lRange(`session:${sessionId}`, 0, -1);
    const parsed = history.map(JSON.parse);

    if (parsed.length > 0) {
      await Transcript.create({
        sessionId,
        logs: parsed,
        createdAt: new Date()
      });
    }

    await client.del(`session:${sessionId}`);

    return res.json({ status: "cleared" });

  } catch (err) {
    console.error("Clear session error:", err);
    res.status(500).json({ error: "Failed to clear session" });
  }
};