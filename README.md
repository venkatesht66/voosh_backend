## RAG News - Backend

This is the backend for the News QA Chat application. It provides a REST API for chat sessions, manages session history in Redis, persists transcripts in MongoDB, supports a RAG pipeline for retrieving relevant news articles, and integrates Gemini API for AI-generated answers.

# Features
	•	REST API for chat sessions and history management  
	•	Redis for in-memory session storage  
	•	MongoDB for session transcripts persistence  
	•	RAG pipeline: Jina embeddings → Qdrant vector store → Gemini API for answers  
	•	Session management: create, list, load history, clear session  
	•	Streaming bot responses  
	•	Cache warming on server startup for faster response  
	•	Environment-configurable TTLs for sessions  

# Architecture

      Frontend (React)  
            |  
            v  
      Backend REST API (Express)  
            |  
      ------------------------------  
      |        |                   |  
    Redis    MongoDB            Qdrant  
    (session  (transcripts)     (vector store)  
    history)  
            |  
            v  
    Gemini API (Generative AI)  

    •	Redis: stores in-memory chat history per session  
	•	MongoDB: persists full transcripts for archival  
	•	Qdrant: vector store for embeddings of news articles  
	•	Gemini API: final answer generation using retrieved context  

# Requirements
	•	Node.js  
	•	npm  
	•	Redis server  
	•	MongoDB server  
	•	Environment variables (see below)  

# Environment Variables
Create a .env file in the root folder:  

PORT=4000  
MONGO_URI=mongodb+srv://venkatesht6:venky457146@clusterelection.hewacgw.mongodb.net/?retryWrites=true&w=majority&appName=ClusterElection  
QDRANT_URL=https://248d3407-d791-401e-b27f-bca5755510e9.eu-west-1-0.aws.cloud.qdrant.io:6333  
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.-tR3rTMkK2duFwjsCE-xn-uk4CNgOoF5t6jcW9eQ1ow  
QDRANT_COLLECTION=news_articles  
JINA_API_KEY=jina_7eb29862cdf64cf1bfa1a0229ceac02dweOnxau-9H1yGWPDx_oYfY3nfoyC  
GEMINI_API_KEY=AIzaSyBT2kBCSFqcrqmfCJUfV7cWJfkWsyd6Uw0  
SESSION_TTL_SECONDS=3600  
SESSION_WARM_COUNT=50  
SESSION_WARM_INTERVAL_MIN=60  
CACHE_MAX_POINTS=10000  
REDIS_URL=redis://default:dQo4HFoYJ1rQ6NExofPM9jcGPhsZOMmc@redis-18067.c17.us-east-1-4.ec2.cloud.redislabs.com:18067  

# Installation

# Clone the repository
git clone https://github.com/venkatesht66/voosh_backend  
cd backend  

# Install dependencies
npm install  

# Start the backend server
npm start  

	•	Server runs on http://localhost:4000 (default)  
	•	On startup, the server warms up Redis with last 50 sessions from MongoDB  

# API Endpoints

Session Endpoints  

Method    Endpoint                              Description  
POST      /api/session/start                    Create a new session, returns sessionId  
GET       /api/session/list                     List all sessions  
GET       /api/session/history?sessionId=<id>   Get session chat history  
DELETE    /api/session/clear?sessionId=<id>     Clear session, archive transcript to Mongo  

Chat Endpoints  

Method      Endpoint                            Description  
POST        /api/chat                           Send a chat message; returns AI answer  
GET         /api/chat/history?sessionId=<id>    Fetch session chat history  
DELETE      /api/chat/clear?sessionId=<id>      Clear chat session, archive transcript  

# Caching & Performance
	•	Redis stores messages per session for fast access  
	•	Session TTL configured via .env (SESSION_TTL_SECONDS)  
	•	Cache warmup preloads last 50 sessions from MongoDB to Redis on server startup  
	•	Session truncation: SESSION_MAX_MESSAGES limits messages in Redis to avoid large memory consumption  

# RAG Pipeline
	1.	Ingest articles using RSS feeds or URL lists  
	2.	Normalize & save articles locally  
	3.	Generate embeddings using Jina embeddings API  
	4.	Store embeddings in Qdrant vector store  
	5.	On a user query:  
	    •	Embed query → search top-k relevant passages from Qdrant  
	    •	Construct context → call Gemini API → generate final answer  

# Ingestion Scripts

Located in /backend/ingestion:  
	•	crawl_rss.py: Fetch articles from RSS feeds, normalize, save locally  
	•	crawl_urls.py: Fetch articles from a URL list, normalize, save  
	•	Configurable --limit for number of articles to fetch  

# Make sure you have Python 3.8+ installed.  

python3 -m pip install -r requirements.txt  

# Example: fetch 50 RSS articles
python crawl_rss.py --limit 50  

# Example: crawl from urls.txt
python crawl_urls.py --urls urls.txt --limit 50  

# Database Models
	•	Session: stores sessionId, messages, createdAt, updatedAt  
	•	Transcript: archives cleared session messages  



# Caching & Performance

# Redis session cache
We use Redis to store live chat sessions for fast retrieval.  

**Environment variables**
- `SESSION_TTL_SECONDS` — Redis TTL for session keys (default `3600` seconds = 1 hour).  
- `SESSION_MAX_MESSAGES` — max number of messages per session retained in Redis (default `200`).  
- `SESSION_WARM_COUNT` — number of recent sessions to warm into Redis on startup (default `50`).  
- `SESSION_WARM_INTERVAL_MIN` — periodic warmup interval in minutes (default `60`).  

**How TTL and trimming works**
- Every time we append a message to `session:<sessionId>` we:  
  1. `rPush` the message JSON to the Redis list.  
  2. `lTrim` to keep only the last `SESSION_MAX_MESSAGES` entries.  
  3. `expire` the key with `SESSION_TTL_SECONDS`.  
This keeps Redis memory bounded and ensures inactive sessions expire automatically.  

**Cache warming**
On server startup we run a warm-up routine that:  
1. Loads the most recently updated `SESSION_WARM_COUNT` sessions from MongoDB.  
2. For each session, if Redis does not already have the key, we push the last messages into Redis and set TTL.  
We also run this routine periodically every `SESSION_WARM_INTERVAL_MIN` minutes (configurable).  

