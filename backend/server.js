require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, T, C, toApi, initDb } = require('./db');
const { kmeans1D } = require('./kmeans');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3105;
const TOKEN = 'mock-jwt-token';

app.get('/', (req, res) => res.json({ success: true, message: 'HR backend is running' }));

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

function requireAuth(req, res, next) {
  if ((req.headers.authorization || '') !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}
app.use('/api/employees', requireAuth);

// ---------- Phase 2: K-Means (declared before /:id routes) ----------
app.get('/api/employees/salary-clusters', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT ${C.salary} FROM ${T}`);
    const clusters = kmeans1D(rows.map((r) => Number(r[C.salary])), 3);
    res.status(200).json({ success: true, clusters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Clustering failed' });
  }
});

// ---------- CRUD ----------
// GET all, or search with ?q=keyword (name / position / status)
app.get('/api/employees', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    let sql = `SELECT * FROM ${T}`;
    const params = [];
    if (q) {
      sql += ` WHERE ${C.name} LIKE ? OR ${C.position} LIKE ? OR ${C.status} LIKE ?`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY ${C.id}`;
    const [rows] = await pool.query(sql, params);
    res.status(200).json(rows.map(toApi));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/employees', async (req, res) => {
  const v = validateEmployee(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  try {
    const [result] = await pool.query(
      `INSERT INTO ${T} (${C.name}, ${C.position}, ${C.status}, ${C.salary}) VALUES (?, ?, 'Active', ?)`,
      [v.n, v.p, v.s]
    );
    const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${C.id} = ?`, [result.insertId]);
    res.status(201).json(toApi(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Validate name / position / salary (shared by create + edit)
function validateEmployee(body) {
  const { name, position, salary } = body || {};
  const n = typeof name === 'string' ? name.trim() : '';
  const p = typeof position === 'string' ? position.trim() : '';
  if (!n || !p || salary === undefined || salary === null || String(salary).trim() === '') {
    return { error: 'name, position and salary are required' };
  }
  const s = Number(salary);
  if (!Number.isFinite(s) || s < 0) return { error: 'salary must be a non-negative number' };
  return { n, p, s };
}

// EDIT employee (name, position, salary)
app.put('/api/employees/:id', async (req, res) => {
  const v = validateEmployee(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  try {
    const [result] = await pool.query(
      `UPDATE ${T} SET ${C.name} = ?, ${C.position} = ?, ${C.salary} = ? WHERE ${C.id} = ?`,
      [v.n, v.p, v.s, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${C.id} = ?`, [req.params.id]);
    res.status(200).json(toApi(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.put('/api/employees/:id/status', async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE ${T} SET ${C.status} = IF(${C.status} = 'Active', 'On Leave', 'Active') WHERE ${C.id} = ?`,
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const [rows] = await pool.query(`SELECT * FROM ${T} WHERE ${C.id} = ?`, [req.params.id]);
    res.status(200).json(toApi(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM ${T} WHERE ${C.id} = ?`, [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, id: String(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }
  res.status(500).json({ success: false, message: 'Server error' });
});

initDb()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`)))
  .catch((err) => {
    console.error('Cannot connect to database. Check backend/.env', err.message);
    process.exit(1);
  });
