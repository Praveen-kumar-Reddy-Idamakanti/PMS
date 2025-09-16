# Rocket.Chat Integration Setup Guide

This guide will help you set up Rocket.Chat integration with your Project Management System.

## Prerequisites

1. A running Rocket.Chat server instance (you already have this installed locally!)
2. Admin access to your Rocket.Chat server
3. User accounts created in Rocket.Chat

## Quick Start (Using Your Local Installation)

Since you already have Rocket.Chat installed in your project folder, you can start it quickly:

### Option 1: Using the provided script
```bash
# Run the batch file (Windows)




# Or run the PowerShell script
.\start-rocket-chat.ps1
```

### Option 2: Manual start
```bash
cd Rocket.Chat
yarn install  # Only needed first time
yarn dev
```

The server will be available at: **http://localhost:3000**

### Initial Setup (First Time Only)

1. **Access Rocket.Chat**: Open http://localhost:3000 in your browser
2. **Create Admin Account**: Set up your first admin user account
3. **Configure Workspace**: Complete the initial workspace setup
4. **Create Channels**: Create channels like `general`, `random`, `support`
5. **Add Users**: Create additional user accounts for your team

## Configuration

### 1. Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:5001/api

# Rocket.Chat Configuration
VITE_ROCKET_CHAT_URL=https://your-rocket-chat-server.com
```

### 2. Rocket.Chat Server Setup

1. **Install Rocket.Chat Server**
   - Follow the official installation guide: https://docs.rocket.chat/installation
   - Or use Docker: `docker run -it --name rocket.chat -p 3000:3000 rocket.chat/rocket.chat:latest`

2. **Configure CORS**
   - In your Rocket.Chat admin panel, go to Settings > General > REST API
   - Add your frontend domain to the CORS origins list
   - Example: `http://localhost:5173,https://yourdomain.com`

3. **Create Channels**
   - Create channels like `general`, `random`, `support`
   - Add users to appropriate channels

### 3. User Authentication

The chat component includes a configuration dialog where users can:
- Enter their Rocket.Chat server URL
- Provide their username and password
- Connect to the chat server

### 4. Features

The integrated chat system includes:

- **Real-time messaging** - Send and receive messages instantly
- **Multiple channels** - Switch between different chat rooms
- **User presence** - See who's online/offline
- **Message history** - View previous conversations
- **Responsive design** - Works on desktop and mobile
- **Connection status** - Visual indicators for connection state

### 5. Security Considerations

- Store credentials securely (consider using OAuth instead of passwords)
- Use HTTPS for production environments
- Implement proper user authentication and authorization
- Regularly update Rocket.Chat server for security patches

### 6. Customization

You can customize the chat interface by:

- Modifying the `AdvancedChatComponent.tsx` file
- Adding new message types or features
- Customizing the UI theme to match your application
- Adding file sharing capabilities
- Implementing voice/video calls

### 7. Troubleshooting

**Connection Issues:**
- Verify the Rocket.Chat server URL is correct
- Check if CORS is properly configured
- Ensure the server is accessible from your frontend domain

**Authentication Issues:**
- Verify username and password are correct
- Check if the user account is active in Rocket.Chat
- Ensure the user has permission to access the channels

**Performance Issues:**
- Consider implementing message pagination for large chat histories
- Use WebSocket connections for real-time updates
- Implement message caching for better performance

## Advanced Integration

For production use, consider:

1. **OAuth Integration** - Use OAuth instead of username/password
2. **Single Sign-On (SSO)** - Integrate with your existing authentication system
3. **Custom API** - Create a custom API to bridge your app with Rocket.Chat
4. **Webhook Integration** - Set up webhooks for real-time notifications
5. **Mobile App** - Use Rocket.Chat's mobile SDKs for native apps

## Support

For issues related to:
- Rocket.Chat server setup: https://docs.rocket.chat/
- This integration: Check the component files and service implementation
- General questions: Refer to the Rocket.Chat community forums
