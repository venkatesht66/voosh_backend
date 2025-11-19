import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.REDIS_URL
});

client.on("connect", () => console.log("Redis client connected"));
client.on("ready", () => console.log("Redis ready"));
client.on("error", (err) => console.error("Redis error:", err));
client.on("end", () => console.log("Redis connection closed"));

await client.connect();

export default client;