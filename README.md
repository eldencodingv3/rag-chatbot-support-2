# CloudSync Pro — RAG Support Chatbot

A Node.js chatbot that uses Retrieval-Augmented Generation (RAG) to answer customer support questions about CloudSync Pro. It combines a local FAQ vector store (LanceDB) with OpenAI's GPT-3.5-turbo to deliver accurate, context-grounded responses.

## Tech Stack

- **Runtime:** Node.js (>=20)
- **Framework:** Express.js
- **Vector Database:** LanceDB (local, embedded)
- **Embeddings:** OpenAI `text-embedding-ada-002` (1536 dimensions)
- **LLM:** OpenAI `gpt-3.5-turbo`

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/eldencodingv3/rag-chatbot-support-2.git
cd rag-chatbot-support-2

# 2. Install dependencies
npm install

# 3. Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# 4. Start the server
npm start
```

The server starts on port 3000 by default. On first launch it generates embeddings for all FAQs — this takes a few seconds.

## Environment Variables

| Variable        | Required | Default | Description                    |
| --------------- | -------- | ------- | ------------------------------ |
| `OPENAI_API_KEY` | Yes      | —       | Your OpenAI API key            |
| `PORT`          | No       | `3000`  | Port the server listens on     |

## API Endpoints

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-03-25T10:00:00.000Z" }
```

### `POST /api/chat`

Send a user message and receive an AI-generated answer grounded in the FAQ dataset.

**Request body:**
```json
{ "message": "How do I reset my password?" }
```

**Response:**
```json
{
  "reply": "To reset your CloudSync Pro password, go to the login page and click 'Forgot Password'...",
  "sources": [
    { "question": "How do I reset my CloudSync Pro password?", "category": "Account & Billing" }
  ]
}
```

## Updating the FAQ Dataset

1. Edit `data/faqs.json` — add, remove, or update entries.
2. Each entry needs `id`, `question`, `answer`, and `category` fields.
3. Restart the server (`npm start`). Embeddings are regenerated on startup.

## Architecture

```
User message
    |
    v
POST /api/chat
    |
    +-> embeddings.js: searchFAQs(message)
    |       |
    |       +-> OpenAI Embeddings API (text-embedding-ada-002)
    |       +-> LanceDB vector search -> top 3 FAQs
    |
    +-> Build system prompt with FAQ context
    |
    +-> OpenAI Chat API (gpt-3.5-turbo) -> response
```

- **Ingestion (startup):** All FAQs are embedded and stored in a local LanceDB table (`lancedb_data/`).
- **Retrieval:** User queries are embedded and compared against FAQ vectors via cosine similarity.
- **Generation:** The top 3 matching FAQs are injected into the system prompt, and GPT-3.5-turbo generates a grounded answer.
