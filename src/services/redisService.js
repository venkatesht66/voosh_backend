import { createClient } from "redis";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// const client = createClient({
//   socket: {
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT
//   }
// });

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("⚠️ REDIS_URL is not set. Redis will not work.");
}

const client = new Redis(redisUrl);

client.on("connect", () => {
  console.log("Redis client connected");
});

client.on("ready", () => {
  console.log("Redis is ready");
});

client.on("error", (err) => {
  console.error("Redis error:", err);
});

client.on("end", () => {
  console.log("Redis connection closed");
});

await client.connect();

export default client;