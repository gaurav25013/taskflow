require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/projects/:projectId/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve frontend (check both possible dist locations)
const fs = require('fs');
const distPaths = [
  path.join(__dirname, 'dist'),
  path.join(__dirname, '../frontend/dist')
];
const distPath = distPaths.find(p => fs.existsSync(p));
if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  console.log(`Serving frontend from: ${distPath}`);
}

app.listen(PORT, () => {
  console.log(`TaskFlow server running on port ${PORT}`);
});
