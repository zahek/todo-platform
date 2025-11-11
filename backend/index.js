require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Postgres
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT || 5432,
});

// Redis
const redisClient = createClient({ url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}` });
redisClient.connect().catch(console.error);

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

// helper
function signAccessToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '900s' });
}
function signRefreshToken(user) {
  return jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' });
}

// --- AUTH ---
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const client = await pool.connect();
  try {
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await client.query('INSERT INTO users(id, email, password_hash, name, email_verified, created_at) VALUES($1,$2,$3,$4,$5,now())', [id, email, hashed, name || null, false]);
    // TODO: send verification email
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'could not register' });
  } finally { client.release(); }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT id, email, password_hash FROM users WHERE email=$1', [email]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'invalid credentials' });
    const user = r.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store refresh token in Redis (set token -> userId) with expiry
    await redisClient.set(`refresh:${refreshToken}`, user.id, { EX: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '2592000') });

    // Send refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '2592000') * 1000 });
    res.json({ accessToken });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'login failed' });
  } finally { client.release(); }
});

app.post('/auth/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    jwt.verify(token, REFRESH_SECRET);
    const userId = await redisClient.get(`refresh:${token}`);
    if (!userId) return res.status(401).json({ error: 'invalid refresh' });
    const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '900s' });
    res.json({ accessToken });
  } catch (err) {
    console.error(err); res.status(401).json({ error: 'invalid token' });
  }
});

app.post('/auth/logout', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await redisClient.del(`refresh:${token}`);
    res.clearCookie('refreshToken');
  }
  res.json({ ok: true });
});

// Middleware: verify access token
function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'no auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad auth' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid access token' });
  }
}

// --- BASIC PROJECTS & TASKS CRUD ---
app.post('/projects', authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  const client = await pool.connect();
  try {
    const id = uuidv4();
    await client.query('INSERT INTO projects(id, owner_id, title, description, created_at) VALUES($1,$2,$3,$4,now())', [id, req.user.id, title, description]);
    res.json({ id, title, description });
  } catch (e) { console.error(e); res.status(500).json({ error: 'could not create' }); } finally { client.release(); }
});

app.get('/projects', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT * FROM projects WHERE owner_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'could not list' }); } finally { client.release(); }
});

app.post('/tasks', authMiddleware, async (req, res) => {
  const { project_id, title, description, assignee_id, due_date, priority } = req.body;
  const client = await pool.connect();
  try {
    const id = uuidv4();
    await client.query('INSERT INTO tasks(id, project_id, title, description, status, priority, assignee_id, created_by, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())', [id, project_id || null, title, description || null, 'todo', priority || 'medium', assignee_id || null, req.user.id]);
    res.json({ id, title });
  } catch (e) { console.error(e); res.status(500).json({ error: 'could not create task' }); } finally { client.release(); }
});

app.get('/tasks', authMiddleware, async (req, res) => {
  const { project_id, status } = req.query;
  const client = await pool.connect();
  try {
    let q = 'SELECT * FROM tasks WHERE (created_by=$1 OR assignee_id=$1)';
    const params = [req.user.id];
    if (project_id) { params.push(project_id); q += f" AND project_id=${{params.length}}"; }
    if (status) { params.push(status); q += f" AND status=${{params.length}}"; }
    q += ' ORDER BY created_at DESC';
    const r = await client.query(q, params);
    res.json(r.rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'could not list tasks' }); } finally { client.release(); }
});

// Start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend listening on', PORT));
