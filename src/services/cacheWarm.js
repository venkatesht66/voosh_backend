import Session from "../models/Session.js";
import client from "./redisService.js";

export const warmupCache = async () => {
  try {
    console.log("Cache warmup started...");

    const sessions = await Session.find({})
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()
      .exec();

    for (const session of sessions) {
      const key = `session:${session.sessionId}`;

      if (session.messages && session.messages.length > 0) {
        const redisMessages = session.messages.map(msg => JSON.stringify({
          role: msg.role,
          content: msg.content,
          ts: msg.ts
        }));

        await client.del(key);
        await client.rPush(key, ...redisMessages);

        const ttlSeconds = parseInt(process.env.SESSION_TTL_SECONDS || "3600", 10);
        await client.expire(key, ttlSeconds);
      }
    }

    console.log(`Cache warmup completed: ${sessions.length} sessions loaded.`);
  } catch (err) {
    console.error("Cache warmup error:", err);
  }
};