/**
 * Smart Bug Tracker - Main Server File
 * Initializes Express app and sets up middleware and routes
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// Import routes
const bugRoutes = require('./routes/bugRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ===== ROUTES =====
app.use('/api/bugs', bugRoutes);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Smart Bug Tracker Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
});

module.exports = app;
