const path = require('path');
const fs = require('fs');

// Load environment variables (supports server/.env and root .env)
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { connectDB, db } = require('./src/storage/db');

// Route imports
const authRoutes = require('./src/routes/auth');
const institutionRoutes = require('./src/routes/institutions');
const caseRoutes = require('./src/routes/cases');
const officialRoutes = require('./src/routes/officials');
const issueGroupRoutes = require('./src/routes/issueGroups');
const relationshipRoutes = require('./src/routes/relationships');
const notificationRoutes = require('./src/routes/notifications');
const reportRoutes = require('./src/routes/reports');
const auditRoutes = require('./src/routes/audit');

const app = express();
const PORT = process.env.PORT || 5000;

// Security hygiene: disable x-powered-by header
app.disable('x-powered-by');

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));

// Lazy DB initialization for Serverless (Vercel) & traditional servers
let dbInitPromise = null;
function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = connectDB();
  }
  return dbInitPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    res.setHeader('X-CaseBridge-Storage-Mode', db.getMode());
    next();
  } catch (err) {
    next(err);
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/officials', officialRoutes);
app.use('/api/issue-groups', issueGroupRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

// Health & System Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    project: 'CaseBridge — AICTE Institution Complaint Monitoring & Coordination System',
    edition: 'Smart India Hackathon 2026 (SIH26264)',
    dbMode: db.getMode(),
    nodeEnv: process.env.NODE_ENV || 'production',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available
const candidateDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'client', 'dist')
];
const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p)) || candidateDistPaths[0];

if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving production client build from ${clientDistPath}`);
  
  // Cache hashed assets for 1 day, while index.html is re-validated
  app.use(express.static(clientDistPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
  }));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
} else {
  // Root friendly landing if client not yet built
  app.get('/', (req, res) => {
    res.json({
      message: 'CaseBridge API Backend is operational.',
      documentation: 'SIH 2026 Problem Statement SIH26264'
    });
  });
}

let server;

// Connect to DB and Start Server
async function startServer() {
  await ensureDb();
  server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 CaseBridge Backend running on http://localhost:${PORT}`);
    console.log(`🏛️  Storage Mode: ${db.getMode().toUpperCase()}`);
    console.log(`⚡ Connected APIs ready for SIH 2026 Evaluation`);
    console.log(`====================================================`);
  });
}

// Graceful shutdown handlers for container/cloud environments
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, gracefully closing CaseBridge server...');
  if (server) {
    server.close(() => {
      console.log('CaseBridge HTTP server closed cleanly.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

// Export app for serverless execution (Vercel)
module.exports = app;

// Only start HTTP listener if executed directly
if (require.main === module) {
  startServer();
}
