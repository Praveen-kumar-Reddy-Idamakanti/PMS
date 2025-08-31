
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getDB } = require('./config/db');
const { initDatabase } = require('./config/initDb');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

// Import routes with debug logging
console.log('Importing routes...');
const authRoutes = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const adminRoutes = require('./routes/admin.routes');
const activityLogsRoutes = require('./routes/activityLogs.routes');
const adminSettingsRoutes = require('./routes/adminSettings.routes');

console.log('Importing remote attendance routes...');
const remoteAttendanceRoutes = require('./routes/remoteAttendanceRoutes');
console.log('Remote attendance routes imported:', remoteAttendanceRoutes ? '✅' : '❌');
console.log('Remote attendance routes stack:', remoteAttendanceRoutes?.stack ? '✅' : '❌');

const adminRemoteAttendanceRoutes = require('./routes/adminRemoteAttendanceRoutes');
console.log('Admin remote attendance routes imported:', adminRemoteAttendanceRoutes ? '✅' : '❌');
console.log('Admin remote attendance routes stack:', adminRemoteAttendanceRoutes?.stack ? '✅' : '❌');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:8080', 
    'http://127.0.0.1:8080',
    'http://localhost:5173', // Vite default dev port
    'http://127.0.0.1:5173',
    
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token', 'Authorization'],
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

// Add CORS debugging middleware
app.use((req, res, next) => {
  console.log(`CORS Debug - ${req.method} ${req.url} from origin: ${req.headers.origin}`);
  console.log('Headers:', req.headers);
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

// Initialize database and then set up routes
const setupRoutes = async () => {
  try {
    // Ensure database is connected and initialized
    logger.info('🔌 Attempting to connect to database...');
    try {
      await connectDB();
      logger.info('✅ Database connected successfully');
    } catch (dbError) {
      logger.error('❌ Failed to connect to database:', dbError);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }
    
    try {
      logger.info('🔄 Initializing database schema...');
      await initDatabase();
      logger.info('✅ Database initialized successfully');
    } catch (initError) {
      logger.error('❌ Database initialization failed:', initError);
      throw new Error(`Database initialization failed: ${initError.message}`);
    }
    
    // API Routes
    logger.info('🔄 Setting up API routes...');
    try {
      console.log('Mounting routes...');
      
      // Mount remote attendance routes first to ensure they're registered
      console.log('Mounting /api/remote-attendance...');
      app.use('/api/remote-attendance', remoteAttendanceRoutes);
      
      // Mount other routes
      console.log('Mounting other routes...');
      app.use('/api/auth', authRoutes);
      app.use('/api/attendance', attendanceRoutes);
      app.use('/api/admin/activity-logs', activityLogsRoutes);
      app.use('/api/admin', adminRoutes);
      app.use('/api/admin/remote-attendance', adminRemoteAttendanceRoutes);
      app.use('/api/admin/settings', adminSettingsRoutes);
      
      console.log('All routes mounted successfully');
      
      // Test route to verify remote attendance route is working
      app.get('/api/test-remote-attendance', (req, res) => {
        res.json({ message: 'Remote attendance route is working!' });
      });
      
      // Debug: Log all registered routes
      console.log('\n=== Registered Routes ===');
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          // Routes registered directly on the app
          console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
          // Routes registered with Router()
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
              console.log(`${methods} ${handler.route.path}`);
            }
          });
        }
      });
      console.log('=========================\n');
      
      logger.info('✅ Routes initialized successfully');
    } catch (routeError) {
      logger.error('❌ Failed to set up routes:', routeError);
      throw new Error(`Route setup failed: ${routeError.message}`);
    }
    
  } catch (error) {
    logger.error('❌ Critical error during application startup:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        // First set up routes and then start server
        await setupRoutes();
        
        // Error handling middleware (must be after routes)
        app.use((err, req, res, next) => {
          console.error('Error:', err);
          res.status(500).json({ 
            error: 'Internal Server Error',
            message: err.message 
          });
        });

        // 404 handler (must be after all routes)
        app.use((req, res) => {
          res.status(404).json({ 
            error: 'Not Found',
            path: req.path,
            method: req.method 
          });
        });

        // Global error handler (must be last)
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
        
        // Start the server after everything is set up
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('🚀 All routes and middleware configured successfully');
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
