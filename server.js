require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB().catch((err) => {
  console.error('Failed to connect to database:', err.message);
  // Continue server startup even if DB connection fails for now
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/panel', require('./routes/panelRoutes'));
app.use('/api/candidate', require('./routes/candidateRoutes'));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
