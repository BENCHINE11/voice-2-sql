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

// Connexion MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // ou 'root' selon ton installation
  database: process.env.DB_NAME, // adapte selon ton nom de BDD
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Auth & internal app DB
const coreDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.AUTH_DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const [existing] = await coreDb.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'User already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    await coreDb.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, password_hash]);

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await coreDb.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// API Gemini → SQL
app.post('/api/text-to-sql', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: 'Text is required' });

    // Generate the prompt that describes the database contraints
    const schemaDescription = `
    Database schema:

    Tables and their columns:
    - clubs(id, name, godfather_id)
    - sectors(id, abbreviation, name, sector_chief_id)
    - staff(id, first_name, last_name, role)
    - students(id, last_name, first_name, email, sexe, sector_id)
    - student_club(student_id, club_id, role)
    - subjects(id, name, description, subject_chief_id)
    - teachers(id, last_name, first_name, email)
    - teacher_subject(teached_id, subject_id)

    Relationships between tables (foreign keys):
    - students.sector_id → sectors.id
    - sectors.sector_chief_id → staff.id
    - clubs.godfather_id → staff.id
    - subjects.subject_chief_id → teachers.id
    - student_club.student_id → students.id
    - student_club.club_id → clubs.id
    - teacher_subject.teacher_id → teacher_id
    - teacher_subject.subject_id → subject_id
    `;

    const prompt = `
    Using the following MySQL database schema and its relationships:

    ${schemaDescription}

    Generate only a valid SQL query (no explanation, no formatting, no markdown) to answer the question: "${text}"
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    // Nettoyage du markdown et extraction de la vraie requête SQL
    const cleanedText = rawText?.replace(/```sql|```/gi, '').trim();

    // Extraire uniquement la première vraie requête SQL
    const match = cleanedText.match(/(SELECT|INSERT|UPDATE|DELETE)[^;]+;/is);
    const sqlQuery = match ? match[0].trim() : cleanedText.split('\n').find(line => line.toUpperCase().startsWith('SELECT'));

    console.log('Final SQL Query:', sqlQuery);

    if (!sqlQuery) return res.status(500).json({ message: 'No valid SQL query extracted.' });

    return res.json({ query: sqlQuery });
  } catch (error) {
    console.error('Gemini API Error:', error?.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to generate SQL' });
  }
});

// API exécution SQL
app.post('/api/execute-query', verifyToken, async (req, res) => {
  const { query } = req.body;

  if (!query) return res.status(400).json({ message: 'Query is required' });

  if (!query.toUpperCase().includes('FROM')) {
    return res.status(400).json({ message: 'Query seems incomplete (missing FROM clause).' });
  }

  if (!isQuerySafe(query)) {
    return res.status(403).json({ message: 'Forbidden operation detected in query.' });
  }

  try {
    console.log('Received query for execution:', query);
    const [rows, fields] = await pool.query(query);
    const columns = fields.map(f => f.name);

    // Save query to history
    const userId = req.user?.userId;
    if (userId) {
      await coreDb.query('INSERT INTO query_history (user_id, query) VALUES (?, ?)', [userId, query]);
    }

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
