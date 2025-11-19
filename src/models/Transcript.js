import mongoose from "mongoose";

const transcriptSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  messages: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Transcript", transcriptSchema);