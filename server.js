/**
 * Smart Bug Tracker - Server
 */

const express = require('express');
const path    = require('path');
const cors    = require('cors');

const authRoutes = require('./routes/authRoutes');
const bugRoutes  = require('./routes/bugRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);

app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', message: 'Server is running' }));

app.use((req, res) =>
  res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Bug Tracker running on http://localhost:${PORT}`);
});

module.exports = app;
