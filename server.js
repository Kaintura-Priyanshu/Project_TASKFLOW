const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// ─── DB CONNECTION ───────────────────────────────────────
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'taskflow_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── MIDDLEWARE: Auth ─────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'taskflow_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── ROUTES: AUTH ─────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );

    const token = jwt.sign(
      { id: result.insertId, name, email },
      process.env.JWT_SECRET || 'taskflow_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'User registered', token, user: { id: result.insertId, name, email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'taskflow_secret',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ROUTES: TASKS ────────────────────────────────────────

// Get all tasks for user
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const [tasks] = await db.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, category, due_date, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const [result] = await db.query(
      'INSERT INTO tasks (user_id, title, description, priority, category, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || '', priority || 'medium', category || 'Other', due_date || null, status || 'pending']
    );

    res.status(201).json({ message: 'Task created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task
app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, category, due_date, status } = req.body;
    await db.query(
      'UPDATE tasks SET title=?, description=?, priority=?, category=?, due_date=?, status=? WHERE id=? AND user_id=?',
      [title, description, priority, category, due_date || null, status, req.params.id, req.user.id]
    );
    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle complete
app.patch('/api/tasks/:id/toggle', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE tasks SET status = IF(status="completed","pending","completed") WHERE id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Task toggled' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stats
app.get('/api/tasks/stats', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        COUNT(*) as total,
        SUM(status='completed') as completed,
        SUM(status='pending') as pending,
        SUM(priority='high' AND status!='completed') as high_priority
       FROM tasks WHERE user_id = ?`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TaskFlow API is running 🚀', timestamp: new Date() });
});

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ TaskFlow server running on port ${PORT}`);
});

module.exports = app;
