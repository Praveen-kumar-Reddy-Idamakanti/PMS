# Rocket.Chat Integration Setup Guide

This guide will help you set up Rocket.Chat integration with your Project Management System.

## Prerequisites

1. A running Rocket.Chat server instance
2. Admin access to your Rocket.Chat server
3. User accounts created in Rocket.Chat

## Quick Start Options

You have several options to get Rocket.Chat running:

### Option 1: Docker (Recommended - Easiest)
```bash
# Run the Docker setup script
start-rocket-chat-docker.bat

# Or manually with Docker Compose
docker-compose -f docker-compose.rocket-chat.yml up -d
```

The server will be available at: **http://localhost:3000**

### Option 2: Use Demo Instance (Quickest)
For immediate testing, you can use the public demo instance:
- Server URL: `https://demo.rocket.chat`
- Create a free account at the demo site
- Use those credentials in your chat interface

### Option 3: Local Development (Advanced)
```bash
cd Rocket.Chat
yarn install  # Only needed first time
yarn dev
```

**Note**: The local development setup has many TypeScript compilation errors and requires significant setup time.

## Initial Setup (First Time Only)

1. **Access Rocket.Chat**: Open your chosen server URL in your browser
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
VITE_ROCKET_CHAT_URL=http://localhost:3000
```

### 2. Using the Chat Interface

1. **Navigate to Chat**: Click on "Chat" in your main navigation
2. **Configure Connection**: Click the settings icon in the chat sidebar
3. **Enter Credentials**: 
   - Server URL: `
The connection was reset

The connection to the server was reset while the page was loading.

    The site could be temporarily unavailable or too busy. Try again in a few moments.
    If you are unable to load any pages, check your computer’s network connection.
    If your computer or network is protected by a firewall or proxy, make sure that Firefox is permitted to access the web.http://localhost:3000` (for local) or `https://demo.rocket.chat` (for demo)
   - Username: Your Rocket.Chat username
   - Password: Your Rocket.Chat password
4. **Connect**: Click "Connect" to establish the connection

## Features

The integrated chat system includes:

- **Real-time messaging** - Send and receive messages instantly
- **Multiple channels** - Switch between different chat rooms
- **User presence** - See who's online/offline
- **Message history** - View previous conversations
- **Responsive design** - Works on desktop and mobile
- **Connection status** - Visual indicators for connection state

## Troubleshooting

### Docker Issues
- Make sure Docker Desktop is running
- Check if ports 3000 and 27017 are available
- View logs: `docker-compose -f docker-compose.rocket-chat.yml logs -f`

### Connection Issues
- Verify the Rocket.Chat server URL is correct
- Check if the server is accessible from your frontend domain
- Ensure username and password are correct

### Local Development Issues
- The local development setup has many TypeScript errors
- Consider using Docker or the demo instance instead
- If you must use local development, you may need to fix dependency issues

## Next Steps

1. **Choose your setup method** (Docker recommended)
2. **Start Rocket.Chat server**
3. **Create your admin account**
4. **Test the chat integration** in your frontend
5. **Create channels and add users**

The chat integration is now ready to use with your Project Management System!



