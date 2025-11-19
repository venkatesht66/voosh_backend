import client from "./redisService.js";

const SESSION_KEY = (sid) => `session:${sid}`;
const TTL = parseInt(process.env.SESSION_TTL_SECONDS || "3600", 10);

export const pushMessage = async (sessionId, messageObj) => {
  const payload = JSON.stringify(messageObj);
  await client.rPush(SESSION_KEY(sessionId), payload);
  await client.expire(SESSION_KEY(sessionId), TTL);
};

export const getSessionMessages = async (sessionId) => {
  const raw = await client.lRange(SESSION_KEY(sessionId), 0, -1);
  await client.expire(SESSION_KEY(sessionId), TTL);
  return raw.map((s) => {
    try { return JSON.parse(s); } catch { return { role: "assistant", content: s }; }
  });
};

export const clearSessionKey = async (sessionId) => {
  await client.del(SESSION_KEY(sessionId));
};