import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { db } from './db/connection.js';
import { seedDatabase } from './db/seed.js';
import { authRouter } from './routes/auth.js';
import { calculatorRouter } from './routes/calculator.js';
import { leadsRouter } from './routes/leads.js';
import { quotesRouter } from './routes/quotes.js';
import { adminRouter } from './routes/admin.js';
import { reportsRouter } from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// Strict Production CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4000'
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (!isProd || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy restriction: Origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Rate Limiting Protection
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Admin API request limit exceeded. Please slow down.' }
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Apply rate limiters
app.use('/api/auth/login', loginLimiter);
app.use('/api/admin', adminLimiter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/calculator', calculatorRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reports', reportsRouter);

// Health check with active runtime database diagnostics
app.get('/api/health', (req, res) => {
  const info = db.getProviderInfo();
  res.json({
    status: 'ONLINE',
    service: 'Prime Energy UK Heat Pump Profitability System',
    timestamp: new Date().toISOString(),
    databaseProvider: info.databaseProvider,
    databaseHost: info.databaseHost
  });
});

// Serve frontend static assets if built
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Serve frontend SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexHtml = path.join(clientDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('Prime Energy API Backend running. Start Vite client for frontend UI.');
    }
  });
});

// Global Error Handler (Sanitizes stack traces & SQL errors in production)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Express Error]:', err);
  const status = err.status || 500;
  const message = isProd ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

import { bootstrapInitialAdmin } from './db/bootstrapAdmin.js';

async function startServer() {
  // Run initial admin bootstrap check (idempotent, safe in prod & dev)
  await bootstrapInitialAdmin();

  // REQUIREMENT 3: DISABLE automatic seedDatabase() during production startup.
  // Production startup must NEVER insert demo/test users, leads or products automatically.
  if (!isProd && process.env.ENABLE_STARTUP_SEED === 'true') {
    console.log('[Dev Startup]: Seeding database...');
    await seedDatabase();
  } else {
    console.log('[Server Boot]: Automatic startup seeding is DISABLED.');
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Prime Energy UK Backend running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
