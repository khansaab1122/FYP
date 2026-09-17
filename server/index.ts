
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { MongoClient, type Collection } from 'mongodb';
import fs from 'fs/promises';
import { Customer, Transaction, BusinessProfile, UserSession } from '../src/types';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGO_DB_NAME || 'smart_khata_ai';
const COLLECTION_NAME = 'smart_khata';

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
  session: UserSession | null;
  employees: unknown[];
}

const DEFAULT_DB: DbSchema = {
  customers: INITIAL_CUSTOMERS,
  profile: INITIAL_PROFILE,
  session: null,
  employees: []
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
        return { ...DEFAULT_DB, ...parsed } as DbSchema;
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

    return { ...DEFAULT_DB, ...document } as DbSchema;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
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

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email === db.profile.ownerEmail) {
    db.session = {
      id: 'user_owner',
      email: email,
      name: db.profile.name || 'Owner',
      businessName: db.profile.name,
      role: 'owner'
    };
    await writeDb(db);
    return res.json({ message: 'Success', user: db.session });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, businessName } = req.body;
  if (!name || !email || !password || !businessName) {
    return res.status(400).json({ error: 'All fields are strictly required' });
  }

  const db = await readDb();
  db.customers = [];
  db.employees = [];
  db.profile = {
    name: businessName,
    ownerEmail: email,
    category: '',
    contact: '',
    address: ''
  };
  db.session = {
    id: 'user_owner',
    email: email,
    name: name,
    businessName: businessName,
    role: 'owner'
  };
  await writeDb(db);
  return res.json({ message: 'Account successfully registered and logged in', user: db.session });
});

app.post('/api/auth/logout', async (req, res) => {
  const db = await readDb();
  db.session = null;
  await writeDb(db);
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/status', async (req, res) => {
  const db = await readDb();
  res.json({ user: db.session, business: db.profile });
});

app.get('/api/customers', async (req, res) => {
  const db = await readDb();
  res.json(db.customers);
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address, image, creditLimit } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }

  const db = await readDb();
  const newCustomer: Customer = {
    id: 'cust_' + Math.floor(Math.random() * 1000000),
    name,
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
  const db = await readDb();

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
  const db = await readDb();

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

  const db = await readDb();
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
    const db = await readDb();
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
        ? 'Face recognition service timed out. Make sure the Python service is running on port 8001.'
        : 'Python face recognition service is unavailable. Start python_face_service/start.ps1 and try again.',
      engine: 'OpenCV YuNet + SFace',
      aiFallback: false,
      localMatch: false,
      timeout: isAbort
    });
  }
});

app.get('/api/reports', async (req, res) => {
  const db = await readDb();

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
  const db = await readDb();
  res.json({ profile: db.profile });
});

app.post('/api/settings', async (req, res) => {
  const { name, category, contact, address } = req.body;
  const db = await readDb();
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
  });
}

startServer();
