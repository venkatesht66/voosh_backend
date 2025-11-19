import { v4 as uuidv4 } from "uuid";
import client from "../services/redisService.js";
import Transcript from "../models/Transcript.js";
import Session from "../models/Session.js";

export const startSession = async (req, res) => {
  try {
    const sessionId = uuidv4();

    const key = `session:${sessionId}`;
    await client.rPush(key, JSON.stringify({ role: "system", content: "session_created", ts: new Date().toISOString() }));
    const MAX_MESSAGES = parseInt(process.env.SESSION_MAX_MESSAGES || "200", 10);
    await client.lTrim(`session:${sessionId}`, -MAX_MESSAGES, -1);
    await client.expire(key, parseInt(process.env.SESSION_TTL_SECONDS || "3600", 10));

    await Session.create({
      sessionId,
      messages: []
    });



    return res.status(201).json({ sessionId });
  } catch (err) {
    console.error("Start session error:", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
};

export const listSessions = async (req, res) => {
  try {
    const rows = await Session.find({})
      .sort({ lastActiveAt: -1 })
      .limit(200)
      .lean()
      .exec();

    const result = rows.map(r => ({
      sessionId: r.sessionId,
      createdAt: r.createdAt,
      lastActiveAt: r.lastActiveAt,
      metadata: r.metadata || {}
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("List sessions error:", err);
    return res.status(500).json({ error: "Failed to list sessions" });
  }
};

export const getSessionHistory = async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
  try {
    const raw = await client.lRange(`session:${sessionId}`, 0, -1);
    // refresh TTL
    await client.expire(`session:${sessionId}`, parseInt(process.env.SESSION_TTL_SECONDS || "3600", 10));
    const messages = raw.map((s) => {
      try { return JSON.parse(s); } catch { return { role: "assistant", content: s }; }
    });
    const count = messages.length;
    const lastMessageAt = messages.length ? (messages[messages.length - 1].ts ?? null) : null;
    return res.json({ sessionId, count, lastMessageAt, messages });
  } catch (err) {
    console.error("Get session history error:", err);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const clearSession = async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
  try {
    const raw = await client.lRange(`session:${sessionId}`, 0, -1);
    const parsed = raw.map((s) => {
      try { return JSON.parse(s); } catch { return { role: "assistant", content: s }; }
    });

    let transcriptDoc = null;
    if (parsed.length > 0) {
      // Save transcript to Mongo
      transcriptDoc = await Transcript.create({
        sessionId,
        messages: parsed,
        createdAt: new Date()
      });
    }

    // Delete the Redis key
    await client.del(`session:${sessionId}`);

    return res.json({
      status: "cleared",
      archived: parsed.length > 0,
      archivedCount: parsed.length,
      transcriptId: transcriptDoc ? transcriptDoc._id : null
    });
  } catch (err) {
    console.error("Clear session error:", err);
    return res.status(500).json({ error: "Failed to clear session" });
  }
};