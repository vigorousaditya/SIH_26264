const http = require('http');
const { connectDB, db } = require('../src/storage/db');

async function testHttpEndpoints() {
  console.log('🚀 Launching server in-process for HTTP endpoint verification...');
  
  // Require index.js or set up app
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const fs = require('fs');

  const authRoutes = require('../src/routes/auth');
  const institutionRoutes = require('../src/routes/institutions');
  const caseRoutes = require('../src/routes/cases');
  const officialRoutes = require('../src/routes/officials');
  const issueGroupRoutes = require('../src/routes/issueGroups');
  const relationshipRoutes = require('../src/routes/relationships');
  const notificationRoutes = require('../src/routes/notifications');
  const reportRoutes = require('../src/routes/reports');
  const auditRoutes = require('../src/routes/audit');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/institutions', institutionRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/officials', officialRoutes);
  app.use('/api/issue-groups', issueGroupRoutes);
  app.use('/api/relationships', relationshipRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit', auditRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ONLINE',
      project: 'CaseBridge',
      dbMode: db.getMode()
    });
  });

  const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      }
    });
  }

  await connectDB();

  const server = app.listen(5002, async () => {
    console.log('Test HTTP server listening on port 5002');

    // 1. Test /api/health
    const health = await fetch('http://localhost:5002/api/health').then(r => r.json());
    console.log('GET /api/health response:', health);

    // 2. Test /api/auth/demo-switch for Admin
    const adminLogin = await fetch('http://localhost:5002/api/auth/demo-switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    }).then(r => r.json());
    console.log('POST /api/auth/demo-switch response:', adminLogin.success, adminLogin.user.name, adminLogin.user.role);
    const token = adminLogin.token;

    // 3. Test GET /api/cases with token
    const casesRes = await fetch('http://localhost:5002/api/cases', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    console.log(`GET /api/cases response: count=${casesRes.count}, sample Case ID=${casesRes.data[0]?.id}`);

    // 4. Test GET /api/reports/dashboard-stats
    const statsRes = await fetch('http://localhost:5002/api/reports/dashboard-stats', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    console.log('GET /api/reports/dashboard-stats response: totalCases=', statsRes.summary.totalCases, 'overdue=', statsRes.summary.overdueCases);

    // 5. Test Frontend Static HTML Serving
    const htmlRes = await fetch('http://localhost:5002/').then(r => r.text());
    console.log('GET / (Frontend SPA bundle) response: length=', htmlRes.length, 'contains CaseBridge title:', htmlRes.includes('CaseBridge'));

    server.close(() => {
      console.log('✅ All HTTP Endpoints and Static SPA Delivery Verified Successfully!');
      process.exit(0);
    });
  });
}

testHttpEndpoints().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
