
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, getDB } = require('./config/db');
const { initDatabase } = require('./config/initDb');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const cron = require('node-cron');
const { runMonthlyAccruals, runYearlyInitAndCarryForward } = require('./jobs/accruals');
const { scheduleDailyStatusUpdate } = require('./jobs/cronJobs');

// Import routes
//auth routes
const authRoutes = require('./routes/auth.routes');
//attendance routes
const attendanceRoutes = require('./routes/attendance.routes');
//admin routes
const adminRoutes = require('./routes/adminroutes/admin.routes');
const activityLogsRoutes = require('./routes/adminroutes/activityLogs.routes');
const adminSettingsRoutes = require('./routes/adminroutes/adminSettings.routes');
const adminRemoteAttendanceRoutes = require('./routes/adminroutes/adminRemoteAttendanceRoutes');
//remote attendance routes
const remoteAttendanceRoutes = require('./routes/remoteAttendanceRoutes');
//leave types routes
const leaveTypesRoutes = require('./routes/leaveroutes/leaveTypes');
const leaveBalancesRoutes = require('./routes/leaveroutes/leaveBalances');
const leaveRequestsRoutes = require('./routes/leaveroutes/leaveRequests');
// calendar routes
const calendarRoutes = require('./routes/calendar.routes');
const eventRoutes = require('./routes/event.routes.js');

// holiday routes
const holidayRoutes = require('./routes/holiday.routes');
const taskRoutes = require('./routes/task.routes');
const userRoutes = require('./routes/user.routes');
const taskCalendarRoutes = require('./routes/taskCalendar.routes'); // New route import

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8081', 
    'http://127.0.0.1:8081',
    process.env.FRONTEND_URL,
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Handle CORS errors
app.use((err, req, res, next) => {
  if (err) {
    logger.error(`CORS Error: ${err.message}`);
    return res.status(500).json({ error: 'CORS Error', details: err.message });
  }
  next();
});

// CORS middleware is already configured above

// Enable CORS with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

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
    
    // Initialize cron jobs
    initializeCronJobs();
    
    cron.schedule('5 0 1 * *', () => {
      runMonthlyAccruals().catch(console.error);
    });
    
    // Run yearly (carry forward) on Jan 1st at 00:10
    cron.schedule('10 0 1 1 *', () => {
      runYearlyInitAndCarryForward().catch(console.error);
    });

    // API Routes
    logger.info('🔄 Setting up API routes...');
    try {
      
      // Mount remote attendance routes first to ensure they're registered
      //remote attendance routes
      app.use('/api/remote-attendance', remoteAttendanceRoutes);
      
      // Mount other routes
      //auth routes
      app.use('/api/auth', authRoutes);
      //attendance routes
      app.use('/api/attendance', attendanceRoutes);
      //admin routes  
      app.use('/api/admin/activity-logs', activityLogsRoutes);
      app.use('/api/admin', adminRoutes);
      app.use('/api/admin/remote-attendance', adminRemoteAttendanceRoutes);
      app.use('/api/admin/settings', adminSettingsRoutes);
      //leave routes
      app.use('/api/leave-types', leaveTypesRoutes);
      app.use('/api/leave-balances', leaveBalancesRoutes);
      app.use('/api/leave-requests', leaveRequestsRoutes);
      
      // calendar routes
      app.use('/api/calendar', calendarRoutes);
      app.use('/api/events', eventRoutes);

      // holiday routes
      app.use('/api/holidays', holidayRoutes);
      app.use('/api/tasks', taskRoutes);
      app.use('/api/users', userRoutes);
      app.use('/api/task-calendar-events', taskCalendarRoutes); // Mount new task calendar routes
      
      
      
      // Debug: Log all registered routes
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          // Routes registered directly on the app
        } else if (middleware.name === 'router') {
          // Routes registered with Router()
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
            }
          });
        }
      });
      
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

function initializeCronJobs() {
  // Schedule monthly accruals (runs on the 1st of every month)
  cron.schedule('0 0 1 * *', async () => {
    logger.info('Running monthly accruals job');
    try {
      await runMonthlyAccruals();
    } catch (error) {
      logger.error('Error in monthly accruals job:', error);
    }
  });

  // Schedule daily status update (runs at 11:59 PM every day)
  scheduleDailyStatusUpdate();
  
  logger.info('All cron jobs have been scheduled');
}

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
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
