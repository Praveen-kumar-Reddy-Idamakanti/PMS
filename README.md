# Project Management System (PMS)

A comprehensive project management system with role-based access control, attendance tracking, leave management, and event scheduling capabilities.

## 🚀 Features

### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Secure password hashing
- Session management

### 2. User Management
- User registration and profile management
- Multiple user roles with hierarchical permissions
- User activity logging
- Account activation/deactivation

### 3. Role-Based Access Control

#### Available Roles:
1. **Super Admin**
   - Full system access
   - Can manage all users and settings
   - Has all permissions

2. **Admin**
   - Can manage HR, Team Leaders, Employees, and Interns
   - Access to most system features

3. **HR**
   - Manage Team Leaders, Employees, and Interns
   - Handle leave approvals
   - Manage attendance records

4. **Team Leader**
   - Manage team members
   - Approve/reject leave requests
   - View team attendance and performance

5. **Employee**
   - Regular system access
   - Can apply for leave
   - View personal attendance and schedule

6. **Intern**
   - Limited access
   - Can view schedule and apply for leave
   - Basic system features

### 4. Attendance Management
- Check-in/check-out functionality
- Attendance reporting
- Remote attendance tracking
- Attendance history and analytics

### 5. Leave Management
- Leave request submission
- Leave approval workflow
- Leave balance tracking
- Leave history and reporting

### 6. Event & Calendar
- Company-wide event scheduling
- Team events and meetings
- Holiday calendar
- Event notifications

## 🛠 Technical Stack

### Frontend
- React.js with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Axios for API communication
- React Router for navigation

### Backend
- Node.js with Express
- SQLite database
- JWT for authentication
- Role-based middleware
- RESTful API architecture

## 🔧 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PMS
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../node_backend
   npm install
   ```

3. **Environment Setup**
   - Create `.env` files in both frontend and backend directories
   - Configure necessary environment variables (refer to `.env.example`)

4. **Start Development Servers**
   ```bash
   # Start backend server
   cd node_backend
   npm run dev
   
   # In a new terminal, start frontend
   cd frontend
   npm run dev
   ```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user (Admin only)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user details
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users` - Get all users (Admin/HR)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/:userId` - Get user attendance

### Leave Management
- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/requests` - Get all leave requests (Manager/HR)
- `PUT /api/leave/requests/:id` - Update leave request status
- `GET /api/leave/balance` - Get leave balance

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event (Admin/HR)
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

## 🔒 Security

- JWT token-based authentication
- Role-based access control
- Secure password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Rate limiting

## 📊 Database Schema

The system uses SQLite with the following main tables:
- Users
- Roles
- Attendance
- LeaveRequests
- LeaveBalances
- Events
- Holidays
- ActivityLogs

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thirdvision Labs
- All contributors who have helped in development

---

**Note**: This is a work in progress. More features and improvements are planned for future releases.
