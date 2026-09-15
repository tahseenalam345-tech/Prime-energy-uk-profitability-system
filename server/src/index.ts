import express from 'express';
import cors from 'cors';
import path from 'path';
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

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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

async function startServer() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Prime Energy UK Backend running on http://localhost:${PORT}`);
  });
}

startServer();
