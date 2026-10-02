
import express from 'express';
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { MongoClient, type Collection } from 'mongodb';
import { createTransport } from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import { Customer, Transaction, BusinessProfile, UserSession } from '../src/types';
import { ensureFaceServiceRunning, checkFaceServiceHealth } from './faceServiceManager';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGO_DB_NAME || 'smart_khata_ai';
const COLLECTION_NAME = 'smart_khata';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = new OAuth2Client();

const PYTHON_FACE_SERVICE_URL = process.env.PYTHON_FACE_SERVICE_URL || 'http://127.0.0.1:8001';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const INITIAL_CUSTOMERS: Customer[] = [];

const INITIAL_PROFILE: BusinessProfile = {
  name: '',
  ownerEmail: '',
  category: '',
  contact: '',
  address: ''
};

interface DbSchema {
  customers: Customer[];
  profile: BusinessProfile;
  sessions: AuthSessionRecord[];
  passwordHash?: string;
  passwordSalt?: string;
  resetCodeHash?: string;
  resetCodeSalt?: string;
  resetCodeExpiresAt?: number;
  resetCodeAttempts?: number;
  resetCodeSentAt?: number;
}

interface AuthSessionRecord {
  tokenHash: string;
  user: UserSession;
  expiresAt: number;
}

const DEFAULT_DB: DbSchema = {
  customers: INITIAL_CUSTOMERS,
  profile: INITIAL_PROFILE,
  sessions: []
};

let mongoClient: MongoClient | null = null;

const DB_FILE = path.join(process.cwd(), 'server', 'database.json');

async function connectToDatabase(): Promise<MongoClient | null> {
  if (mongoClient) return mongoClient;

  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set — using local file DB fallback (server/database.json) for development.');
    return null;
  }

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  console.log(`Connected to MongoDB Atlas database: ${DB_NAME}`);
  return mongoClient;
}

async function getCollection(): Promise<Collection<DbSchema> | null> {
  const client = await connectToDatabase();
  if (!client) return null;
  return client.db(DB_NAME).collection<DbSchema>(COLLECTION_NAME);
}

async function readDb(): Promise<DbSchema> {
  try {
    if (!MONGODB_URI) {
      try {
        const raw = await fs.readFile(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw || '{}');
        const storedData = { ...parsed } as DbSchema & { session?: unknown; employees?: unknown };
        const hasLegacyFields = 'session' in storedData || 'employees' in storedData;
        const hasValidSessions = Array.isArray(storedData.sessions);
        delete storedData.session;
        delete storedData.employees;
        if (!hasValidSessions) storedData.sessions = [];

        const db = { ...DEFAULT_DB, ...storedData } as DbSchema;
        if (hasLegacyFields || !hasValidSessions) {
          await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        }
        return db;
      } catch (err) {
        // create initial file
        await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
        await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
        return DEFAULT_DB;
      }
    }

    const collection = await getCollection();
    if (!collection) return DEFAULT_DB;
    const document = await collection.findOne({});

    if (!document) {
      await collection.insertOne(DEFAULT_DB);
      return DEFAULT_DB;
    }

    const storedData = { ...document } as DbSchema & { session?: unknown; employees?: unknown };
    const hasLegacyFields = 'session' in storedData || 'employees' in storedData;
    const hasValidSessions = Array.isArray(storedData.sessions);
    delete storedData.session;
    delete storedData.employees;
    if (!hasValidSessions) storedData.sessions = [];

    if (hasLegacyFields || !hasValidSessions) {
      await collection.updateOne(
        { _id: document._id },
        { $set: { sessions: storedData.sessions }, $unset: { session: '', employees: '' } }
      );
    }

    return { ...DEFAULT_DB, ...storedData } as DbSchema;
  } catch (error) {
    console.error('Error reading DB:', error);
    return DEFAULT_DB;
  }
}

async function writeDb(data: DbSchema) {
  try {
    if (!MONGODB_URI) {
      await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
      await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return;
    }

    const collection = await getCollection();
    if (!collection) {
      console.error('No DB collection available to write to.');
      return;
    }
    await collection.replaceOne({}, data, { upsert: true });
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

function stripDataUriPrefix(dataUri: string): string {
  return dataUri.replace(/^data:image\/\w+;base64,/, '');
}

const PASSWORD_HASH_BYTES = 64;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_SETUP_TOKEN = process.env.SMART_KHATA_PASSWORD_SETUP_TOKEN || '';
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_RESEND_MS = 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const OWNER_SETUP_TOKEN = process.env.SMART_KHATA_OWNER_SETUP_TOKEN || '';
const AUTH_COOKIE_NAME = 'smart_khata_session';
const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_AUTH_SESSIONS = 20;
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_HASH_BYTES, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function createPasswordCredentials(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derivePasswordHash(password, salt);
  return { passwordSalt: salt, passwordHash: hash.toString('hex') };
}

async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  if (!/^[a-f0-9]{128}$/i.test(storedHash)) return false;
  const expectedHash = Buffer.from(storedHash, 'hex');
  const actualHash = await derivePasswordHash(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
}

function isValidPassword(password: unknown): password is string {
  return typeof password === 'string'
    && password.length >= MIN_PASSWORD_LENGTH
    && password.length <= MAX_PASSWORD_LENGTH;
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionToken(req: express.Request): string | null {
  const cookie = req.headers.cookie?.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${AUTH_COOKIE_NAME}=`));
  return cookie ? cookie.slice(AUTH_COOKIE_NAME.length + 1) : null;
}

function setSessionCookie(res: express.Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_SESSION_TTL_MS / 1000}${secure}`);
}

function clearSessionCookie(res: express.Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function findAuthSession(req: express.Request, db: DbSchema): AuthSessionRecord | undefined {
  const token = getSessionToken(req);
  if (!token) return undefined;

  const tokenHash = createHash('sha256').update(token).digest('hex');
  return db.sessions.find(session => session.expiresAt > Date.now()
    && normalizeEmail(session.user.email) === normalizeEmail(db.profile.ownerEmail || '')
    && safeStringEqual(session.tokenHash, tokenHash));
}

async function createAuthSession(db: DbSchema, user: UserSession, res: express.Response): Promise<void> {
  const now = Date.now();
  db.sessions = db.sessions.filter(session => session.expiresAt > now).slice(-(MAX_AUTH_SESSIONS - 1));
  const token = randomBytes(32).toString('base64url');
  db.sessions.push({
    tokenHash: createHash('sha256').update(token).digest('hex'),
    user,
    expiresAt: now + AUTH_SESSION_TTL_MS
  });
  await writeDb(db);
  setSessionCookie(res, token);
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  try {
    const db = await readDb();
    if (!findAuthSession(req, db)) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.locals.authDb = db;
    next();
  } catch (error) {
    next(error);
  }
}

async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  const transport = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });

  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Smart Khata password reset code',
    text: `Your Smart Khata password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your Smart Khata password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`
  });
}

function clearPasswordResetFields(db: DbSchema): void {
  delete db.resetCodeHash;
  delete db.resetCodeSalt;
  delete db.resetCodeExpiresAt;
  delete db.resetCodeAttempts;
  delete db.resetCodeSentAt;
}

async function performPythonFaceMatch(capturedImage: string, candidates: Customer[]) {
  if (candidates.length === 0) {
    return {
      matchFound: false,
      matchedCustomerId: null,
      confidenceScore: 0,
      analysis: 'No registered face references found. Please register a customer face first.',
      engine: 'OpenCV YuNet + SFace'
    };
  }

  // Automatically ensure Python face recognition service is running
  await ensureFaceServiceRunning();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${PYTHON_FACE_SERVICE_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: capturedImage,
        references: candidates.map(c => ({ customerId: c.id, image: c.image }))
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || `Python face service returned HTTP ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/* --- API ROUTES --- */

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await readDb();

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim()
    || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!db.passwordHash || !db.passwordSalt) {
    if (normalizeEmail(email) === normalizeEmail(db.profile.ownerEmail || '')) {
      return res.status(409).json({
        code: 'PASSWORD_SETUP_REQUIRED',
        error: 'This existing account needs a one-time password setup before you can sign in.'
      });
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const matchesEmail = normalizeEmail(email) === normalizeEmail(db.profile.ownerEmail || '');
  const matchesPassword = await verifyPassword(password, db.passwordSalt, db.passwordHash);
  if (!matchesEmail || !matchesPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user: UserSession = {
    id: 'user_owner',
    email: normalizeEmail(email),
    name: db.profile.name || 'Owner',
    businessName: db.profile.name,
    role: 'owner'
  };
  await createAuthSession(db, user, res);
  return res.json({ message: 'Success', user });
});

app.get('/api/auth/google/config', (_req, res) => {
  res.json({ clientId: GOOGLE_CLIENT_ID });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
  }
  if (typeof credential !== 'string' || !credential) {
    return res.status(400).json({ error: 'A Google credential is required.' });
  }

  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const googleUser = ticket.getPayload();
    if (!googleUser?.email || !googleUser.email_verified) {
      return res.status(401).json({ error: 'Google did not verify this email address.' });
    }

    const db = await readDb();
    const email = normalizeEmail(googleUser.email);
    if (!db.profile.ownerEmail || email !== normalizeEmail(db.profile.ownerEmail)) {
      return res.status(403).json({ error: 'This Google account is not registered as the Smart Khata owner.' });
    }

    const user: UserSession = {
      id: 'user_owner',
      email,
      name: googleUser.name || db.profile.name || 'Owner',
      businessName: db.profile.name,
      role: 'owner'
    };
    await createAuthSession(db, user, res);
    return res.json({ message: 'Success', user });
  } catch {
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, businessName } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()
    || typeof businessName !== 'string' || !businessName.trim() || !isValidPassword(password)) {
    return res.status(400).json({ error: 'All fields are required; password must be 8 to 128 characters.' });
  }

  const db = await readDb();
  if (db.profile.ownerEmail || db.passwordHash) {
    return res.status(409).json({ error: 'An account already exists. Please sign in instead.' });
  }
  if (process.env.NODE_ENV === 'production' && OWNER_SETUP_TOKEN.length < 32) {
    return res.status(503).json({ error: 'Owner registration is not configured on this server.' });
  }
  if (OWNER_SETUP_TOKEN && (typeof req.body.ownerSetupToken !== 'string'
    || !safeStringEqual(req.body.ownerSetupToken, OWNER_SETUP_TOKEN))) {
    return res.status(401).json({ error: 'Invalid owner setup token.' });
  }

  Object.assign(db, await createPasswordCredentials(password));
  db.profile = {
    ...db.profile,
    name: businessName.trim(),
    ownerEmail: normalizeEmail(email),
    category: '',
    contact: db.profile.contact || '',
    address: db.profile.address || ''
  };
  const user: UserSession = {
    id: 'user_owner',
    email: normalizeEmail(email),
    name: name.trim(),
    businessName: businessName.trim(),
    role: 'owner'
  };
  await createAuthSession(db, user, res);
  return res.json({ message: 'Account successfully registered and logged in', user });
});

app.post('/api/auth/initialize-password', async (req, res) => {
  const { email, password, setupToken } = req.body;
  if (PASSWORD_SETUP_TOKEN.length < 32) {
    return res.status(503).json({ error: 'One-time password setup is not enabled on this server.' });
  }
  if (typeof setupToken !== 'string' || !safeStringEqual(setupToken, PASSWORD_SETUP_TOKEN)) {
    return res.status(401).json({ error: 'Invalid one-time setup token.' });
  }
  if (typeof email !== 'string' || !email.trim() || !isValidPassword(password)) {
    return res.status(400).json({ error: 'A valid email and a password of 8 to 128 characters are required.' });
  }

  const db = await readDb();
  if (!db.profile.ownerEmail || normalizeEmail(email) !== normalizeEmail(db.profile.ownerEmail)
    || db.passwordHash || db.passwordSalt) {
    return res.status(409).json({ error: 'This account is not eligible for password setup.' });
  }

  Object.assign(db, await createPasswordCredentials(password));
  const user: UserSession = {
    id: 'user_owner',
    email: normalizeEmail(email),
    name: db.profile.name || 'Owner',
    businessName: db.profile.name,
    role: 'owner'
  };
  await createAuthSession(db, user, res);
  return res.json({ message: 'Password set successfully', user });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!SMTP_HOST || !SMTP_FROM) {
    return res.status(503).json({ error: 'Password reset email is not configured. Ask the administrator to configure SMTP.' });
  }

  const db = await readDb();
  const normalizedEmail = normalizeEmail(email);
  const genericMessage = 'If this email belongs to an account, a reset code has been sent.';
  const now = Date.now();
  const accountExists = normalizedEmail === normalizeEmail(db.profile.ownerEmail || '');

  if (!accountExists) {
    return res.json({ message: genericMessage });
  }
  if (db.resetCodeSentAt && now - db.resetCodeSentAt < PASSWORD_RESET_RESEND_MS) {
    return res.json({ message: genericMessage });
  }

  const code = randomInt(100000, 1000000).toString();
  const salt = randomBytes(16).toString('hex');
  const hash = await derivePasswordHash(code, salt);
  db.resetCodeHash = hash.toString('hex');
  db.resetCodeSalt = salt;
  db.resetCodeExpiresAt = now + PASSWORD_RESET_TTL_MS;
  db.resetCodeAttempts = 0;
  db.resetCodeSentAt = now;
  await writeDb(db);

  try {
    await sendPasswordResetEmail(normalizedEmail, code);
  } catch (error) {
    clearPasswordResetFields(db);
    await writeDb(db);
    console.error('Password reset email delivery failed:', error);
    return res.status(502).json({ error: 'Could not send the reset email. Check the SMTP settings and try again.' });
  }

  return res.json({ message: genericMessage });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, password } = req.body;
  if (typeof email !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)
    || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Enter the six-digit code and a password of 8 to 128 characters.' });
  }

  const db = await readDb();
  const emailMatches = normalizeEmail(email) === normalizeEmail(db.profile.ownerEmail || '');
  if (!emailMatches || !db.resetCodeHash || !db.resetCodeSalt || !db.resetCodeExpiresAt) {
    return res.status(400).json({ error: 'The reset code is invalid or expired. Request a new code.' });
  }

  if (Date.now() > db.resetCodeExpiresAt || (db.resetCodeAttempts || 0) >= PASSWORD_RESET_MAX_ATTEMPTS) {
    clearPasswordResetFields(db);
    await writeDb(db);
    return res.status(400).json({ error: 'The reset code is invalid or expired. Request a new code.' });
  }

  const codeIsValid = await verifyPassword(code, db.resetCodeSalt, db.resetCodeHash);
  if (!codeIsValid) {
    db.resetCodeAttempts = (db.resetCodeAttempts || 0) + 1;
    await writeDb(db);
    return res.status(400).json({ error: 'The reset code is invalid or expired. Request a new code.' });
  }

  Object.assign(db, await createPasswordCredentials(password));
  clearPasswordResetFields(db);
  db.sessions = [];
  await writeDb(db);
  clearSessionCookie(res);
  return res.json({ message: 'Password reset successfully. Sign in with your new password.' });
});

app.post('/api/auth/logout', async (req, res) => {
  const db = await readDb();
  const token = getSessionToken(req);
  if (token) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    db.sessions = db.sessions.filter(session => !safeStringEqual(session.tokenHash, tokenHash));
  }
  await writeDb(db);
  clearSessionCookie(res);
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/status', async (req, res) => {
  const db = await readDb();
  const session = findAuthSession(req, db);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: session?.user || null, business: session ? db.profile : null });
});

app.use('/api', requireAuth);

app.get('/api/customers', async (req, res) => {
  const db = res.locals.authDb as DbSchema;
  res.json(db.customers);
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address, image, creditLimit } = req.body;
  if (typeof name !== 'string' || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name.trim())) {
    return res.status(400).json({ error: 'Customer name must contain letters only.' });
  }
  if (typeof phone !== 'string' || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone number must contain exactly 11 digits.' });
  }

  const db = res.locals.authDb as DbSchema;
  const newCustomer: Customer = {
    id: 'cust_' + Math.floor(Math.random() * 1000000),
    name: name.trim(),
    phone,
    address: address || '',
    image: image || '',
    creditLimit: Number(creditLimit) || 10000,
    balance: 0,
    createdAt: new Date().toISOString(),
    transactions: []
  };

  db.customers.push(newCustomer);
  await writeDb(db);
  res.json(newCustomer);
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, image, creditLimit } = req.body;
  if (phone !== undefined && (typeof phone !== 'string' || !/^\d{11}$/.test(phone))) {
    return res.status(400).json({ error: 'Phone number must contain exactly 11 digits.' });
  }
  const db = res.locals.authDb as DbSchema;

  const custIndex = db.customers.findIndex(c => c.id === id);
  if (custIndex === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  db.customers[custIndex] = {
    ...db.customers[custIndex],
    name: name !== undefined ? name : db.customers[custIndex].name,
    phone: phone !== undefined ? phone : db.customers[custIndex].phone,
    address: address !== undefined ? address : db.customers[custIndex].address,
    image: image !== undefined ? image : db.customers[custIndex].image,
    creditLimit: creditLimit !== undefined ? Number(creditLimit) : db.customers[custIndex].creditLimit,
  };

  await writeDb(db);
  res.json(db.customers[custIndex]);
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const db = res.locals.authDb as DbSchema;

  const initialCount = db.customers.length;
  db.customers = db.customers.filter(c => c.id !== id);

  if (db.customers.length === initialCount) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  await writeDb(db);
  res.json({ message: 'Customer deleted successfully' });
});

app.post('/api/transactions', async (req, res) => {
  const { customerId, type, amount, description } = req.body;
  if (!customerId || !type || !amount) {
    return res.status(400).json({ error: 'CustomerId, type, and amount are required' });
  }

  const numericAmount = Math.abs(Number(amount));
  if (isNaN(numericAmount) || numericAmount === 0) {
    return res.status(400).json({ error: 'Amount must be a non-zero number' });
  }

  const db = res.locals.authDb as DbSchema;
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const newTx: Transaction = {
    id: 'tx_' + Math.floor(Math.random() * 1000000),
    type: type as 'credit' | 'payment',
    amount: numericAmount,
    description: description || (type === 'credit' ? 'Purchased credit goods' : 'Paid balance amount'),
    date: new Date().toISOString()
  };

  if (type === 'credit') {
    customer.balance += numericAmount;
  } else {
    customer.balance -= numericAmount;
  }

  customer.transactions.unshift(newTx);
  await writeDb(db);
  res.json({ customer, transaction: newTx });
});

app.post('/api/face/verify', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Captured input image is required' });
  }

  try {
    const db = res.locals.authDb as DbSchema;
    const candidates = db.customers.filter(c => c.image && c.image.length > 50);
    const result = await performPythonFaceMatch(image, candidates);
    return res.json({
      ...result,
      aiFallback: false,
      localMatch: true,
      timeout: false
    });
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError';
    console.error('Python face verification error:', error);
    return res.status(503).json({
      matchFound: false,
      matchedCustomerId: null,
      confidenceScore: 0,
      analysis: isAbort
        ? 'Face recognition service timed out. Please try scanning again.'
        : 'Face recognition service is initializing or busy. Please try again in a moment.',
      engine: 'OpenCV YuNet + SFace',
      aiFallback: false,
      localMatch: false,
      timeout: isAbort
    });
  }
});

app.get('/api/face/status', async (req, res) => {
  const isHealthy = await checkFaceServiceHealth(800);
  res.json({
    ok: isHealthy,
    service: 'OpenCV YuNet + SFace',
    port: 8001
  });
});

app.get('/api/reports', async (req, res) => {
  const db = res.locals.authDb as DbSchema;

  const totalCustomers = db.customers.length;
  const totalCredit = db.customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalReceived = db.customers.reduce((sum, c) => {
    const rxTotal = c.transactions
      .filter(t => t.type === 'payment')
      .reduce((s, t) => s + t.amount, 0);
    return sum + rxTotal;
  }, 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const trends = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthName = months[d.getMonth()] + ' ' + d.getFullYear();

    let creditAmount = 0;
    let paymentAmount = 0;

    db.customers.forEach(c => {
      c.transactions.forEach(t => {
        const txDate = new Date(t.date);
        if (txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear()) {
          if (t.type === 'credit') creditAmount += t.amount;
          else paymentAmount += t.amount;
        }
      });
    });

    // If no transaction data exists, show sample data
    if (creditAmount === 0 && paymentAmount === 0 && db.customers.length === 0) {
      creditAmount = Math.floor(Math.random() * 50000) + 5000;
      paymentAmount = Math.floor(Math.random() * 30000) + 2000;
    }

    return {
      month: monthName,
      CreditIssued: creditAmount,
      PaymentsReceived: paymentAmount
    };
  });

  res.json({
    metrics: {
      totalCustomers,
      totalCredit,
      receivedPayments: totalReceived,
      pendingAmount: totalCredit
    },
    trends
  });
});

app.get('/api/settings', async (req, res) => {
  const db = res.locals.authDb as DbSchema;
  res.json({ profile: db.profile });
});

app.post('/api/settings', async (req, res) => {
  const { name, category, contact, address } = req.body;
  const db = res.locals.authDb as DbSchema;
  db.profile = {
    ...db.profile,
    name: name || db.profile.name,
    category: category || db.profile.category,
    contact: contact || db.profile.contact,
    address: address || db.profile.address,
  };
  await writeDb(db);
  res.json(db.profile);
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.argv[1]?.includes('dist');

  await connectToDatabase();

  // Automatically start Python face recognition service in background on server boot
  ensureFaceServiceRunning().catch((err) => {
    console.warn('[Face Service] Background auto-start error:', err);
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server linked as middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production-compiled static React build.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Face Recognition service starts automatically with the server.`);
  });
}

startServer();
