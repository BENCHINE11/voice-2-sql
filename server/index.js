import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import axios from 'axios';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Connexion MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // ou 'root' selon ton installation
  database: 'ensat', // adapte selon ton nom de BDD
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
app.post('/api/execute-query', async (req, res) => {
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
    return res.json({
      fields: columns,
      rows
    });
  } catch (error) {
    console.error('Query execution error:', error.message);
    return res.status(500).json({ message: 'SQL Execution failed', error: error.message });
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
