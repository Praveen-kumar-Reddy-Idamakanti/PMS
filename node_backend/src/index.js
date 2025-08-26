require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getDB } = require('./config/db');
const { initDatabase } = require('./config/initDb');
const authRoutes = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Enable CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // Debugging middleware - log all requests
// app.use((req, res, next) => {
//   const timestamp = new Date().toISOString();
//   console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
//   console.log('Headers:', JSON.stringify(req.headers, null, 2));
//   if (Object.keys(req.body).length > 0) {
//     console.log('Body:', JSON.stringify(req.body, null, 2));
//   }
//   if (Object.keys(req.query).length > 0) {
//     console.log('Query:', JSON.stringify(req.query, null, 2));
//   }
//   next();
// });

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the PMS API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        const db = getDB();
        
        // Initialize database
        await initDatabase();
        
        // Start the server after database is ready
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
