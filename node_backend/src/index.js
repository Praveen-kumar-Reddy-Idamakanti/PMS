require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getDB } = require('./config/db');
const { initDatabase } = require('./config/initDb');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const adminRoutes = require('./routes/admin.routes');
const activityLogsRoutes = require('./routes/activityLogs.routes');
const adminSettingsRoutes = require('./routes/adminSettings.routes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:8080', 
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Log CORS errors
app.use((err, req, res, next) => {
  if (err) {
    logger.error('CORS Error:', err);
    return res.status(500).json({ error: 'CORS Error', details: err.message });
  }
  next();
});

// Enable CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (must be after body parser)
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the PMS API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/activity-logs', activityLogsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  logger.error('Unhandled Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id || 'anonymous'
  });

  // Don't leak error details in production
  const errorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      details: err.details 
    })
  };

  res.status(statusCode).json(errorResponse);
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
