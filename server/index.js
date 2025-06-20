import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import express from 'express';
import mysql from 'mysql2/promise';

import { verifyToken } from './middleware/auth.js';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// Connect to DB
app.post('/api/connect-db', async (req, res) => {
  const { host, user, password, database } = req.body;

  try {
    const connection = await mysql.createConnection({ host, user, password, database });
    const [tables] = await connection.query("SHOW TABLES");

    const schema = {};
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
      schema[tableName] = columns.map(col => col.Field);
    }

    await connection.end();
    return res.json({ message: 'Connected and schema retrieved', schema });
  } catch (error) {
    console.error('Connection failed:', error.message);
    return res.status(500).json({ message: 'Connection failed', error: error.message });
  }
});

// API Gemini → SQL
app.post('/api/text-to-sql', async (req, res) => {
  try {
    const { text, schema } = req.body;

    if (!text || !schema) return res.status(400).json({ message: 'Text and schema are required' });

    const schemaDescription = Object.entries(schema).map(([table, cols]) =>
      `- ${table}(${cols.join(', ')})`
    ).join('\n');

    const prompt = `
Using the following MySQL schema:

${schemaDescription}

Generate only a valid SQL query (no explanation, no formatting, no markdown) to answer the question: "${text}"
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const cleanedText = rawText?.replace(/```sql|```/gi, '').trim();
    const match = cleanedText.match(/(SELECT|INSERT|UPDATE|DELETE)[^;]+;/is);
    const sqlQuery = match ? match[0].trim() : cleanedText.split('\n').find(line => line.toUpperCase().startsWith('SELECT'));

    if (!sqlQuery) return res.status(500).json({ message: 'No valid SQL query extracted.' });

    return res.json({ query: sqlQuery });
  } catch (error) {
    console.error('Gemini API Error:', error?.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to generate SQL' });
  }
});


// API exécution SQL
app.post('/api/execute-query', async (req, res) => {
  const { query, dbConfig } = req.body;

  if (!query || !dbConfig) {
    return res.status(400).json({ message: 'Query and DB config are required' });
  }

  if (!query.toUpperCase().includes('FROM')) {
    return res.status(400).json({ message: 'Query seems incomplete (missing FROM clause).' });
  }


  if (!isQuerySafe(query)) {
    return res.status(403).json({ message: 'Forbidden operation detected in query.' });
  }

  const { host, user, password, database } = dbConfig;

  try {
    console.log('Received query for execution:', query);
    const connection = await mysql.createConnection({ host, user, password, database });
    const [rows, fields] = await connection.query(query);
    const columns = fields.map(f => f.name);
    await connection.end();
    return res.json({ fields: columns, rows });
  } catch (error) {
    console.error('Query execution error:', error.message);
    return res.status(500).json({ message: 'SQL Execution failed', error: error.message });
  }
});

// Query History
app.get('/api/history', verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await coreDb.query(
      'SELECT id, query, created_at, is_bookmarked FROM query_history WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch history.' });
  }
});

// Function to prevent the usage of characters such as 'DROP', 'DELETE', 'CREATE'
function isQuerySafe(query) {
  const forbiddenKeywords = ['DROP', 'ALTER', 'TRUNCATE', 'DELETE', 'CREATE', 'REPLACE'];
  return !forbiddenKeywords.some(keyword =>
    query.toUpperCase().includes(keyword)
  );
}

// Lancement serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
