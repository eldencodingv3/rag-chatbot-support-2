import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeEmbeddings, searchFAQs } from './embeddings.js';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let embeddingsReady = false;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', embeddingsReady, timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  if (!embeddingsReady) {
    return res.status(503).json({ error: 'Service initializing. Please try again shortly.' });
  }

  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Search for relevant FAQs
    const relevantFAQs = await searchFAQs(message);

    // 2. Build context from retrieved FAQs
    const context = relevantFAQs
      .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
      .join('\n\n');

    // 3. Generate response with GPT-3.5-turbo
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful customer support assistant for CloudSync Pro. Answer the user's question based on the following FAQ context. If the context doesn't contain relevant information, say you don't have that information and suggest contacting support.\n\nFAQ Context:\n${context}`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;
    const sources = relevantFAQs.map((faq) => ({
      question: faq.question,
      category: faq.category,
    }));

    res.json({ reply, sources });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Start server first, THEN initialize embeddings in the background
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not set. Chat endpoint will not work.');
    return;
  }

  initializeEmbeddings()
    .then(() => {
      embeddingsReady = true;
      console.log('Embeddings ready');
    })
    .catch((err) => console.error('Failed to initialize embeddings:', err));
});
