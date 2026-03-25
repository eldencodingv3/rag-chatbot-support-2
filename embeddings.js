import * as lancedb from '@lancedb/lancedb';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let table;

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

export async function initializeEmbeddings() {
  const dbPath = path.join(__dirname, 'lancedb_data');
  const db = await lancedb.connect(dbPath);

  // Load FAQs
  const faqsPath = path.join(__dirname, 'data', 'faqs.json');
  const faqs = JSON.parse(fs.readFileSync(faqsPath, 'utf-8'));

  console.log(`Generating embeddings for ${faqs.length} FAQs...`);

  // Generate embeddings for all FAQs
  const records = [];
  for (const faq of faqs) {
    const text = `${faq.question} ${faq.answer}`;
    const vector = await getEmbedding(text);
    records.push({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'general',
      vector: vector,
    });
  }

  // Create or overwrite table
  try {
    await db.dropTable('faqs');
  } catch (e) {
    // Table doesn't exist yet, that's fine
  }
  table = await db.createTable('faqs', records);
  console.log('Embeddings initialized successfully');
}

export async function searchFAQs(query, limit = 3) {
  const queryVector = await getEmbedding(query);
  const results = await table.vectorSearch(queryVector).limit(limit).toArray();
  return results;
}
