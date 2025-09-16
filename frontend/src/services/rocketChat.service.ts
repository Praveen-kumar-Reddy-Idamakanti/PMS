// Rocket.Chat Integration Service
// This service handles the connection and communication with Rocket.Chat

export interface RocketChatConfig {
  serverUrl: string;
  username: string;
  password: string;
  useSSL?: boolean;
}

export interface RocketChatMessage {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  timestamp: Date;
  roomId: string;
  type: 'message' | 'system' | 'notification';
}

export interface RocketChatRoom {
  id: string;
  name: string;
  type: 'channel' | 'direct' | 'group';
  description?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: Date;
  members?: number;
}

export class RocketChatService {
  private config: RocketChatConfig | null = null;
  private isConnected = false;
  private authToken: string | null = null;
  private userId: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    // Load configuration from environment variables or localStorage
    const serverUrl = import.meta.env.VITE_ROCKET_CHAT_URL || 
                     localStorage.getItem('rocketChat_serverUrl') || 
                     'https://demo.rocket.chat'; // Default to demo instance for testing
    const username = localStorage.getItem('rocketChat_username');
    const password = localStorage.getItem('rocketChat_password');
    
    if (serverUrl && username && password) {
      this.config = {
        serverUrl,
        username,
        password,
        useSSL: serverUrl.startsWith('https://')
      };
    }
  }

  async connect(config?: Partial<RocketChatConfig>): Promise<boolean> {
    try {
      if (config) {
        this.config = { ...this.config, ...config } as RocketChatConfig;
        this.saveConfig();
      }

      if (!this.config) {
        throw new Error('Rocket.Chat configuration not found');
      }

      // For now, we'll simulate a connection
      // In a real implementation, you would use the Rocket.Chat SDK
      await this.simulateConnection();
      
      this.isConnected = true;
      this.emit('connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to Rocket.Chat:', error);
      this.emit('error', error);
      return false;
    }
  }

  private async simulateConnection(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate authentication
    this.authToken = 'mock_auth_token_' + Date.now();
    this.userId = 'mock_user_id_' + Date.now();
  }

  private saveConfig() {
    if (this.config) {
      localStorage.setItem('rocketChat_serverUrl', this.config.serverUrl);
      localStorage.setItem('rocketChat_username', this.config.username);
      localStorage.setItem('rocketChat_password', this.config.password);
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.authToken = null;
    this.userId = null;
    this.emit('disconnected');
  }

  async getRooms(): Promise<RocketChatRoom[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to Rocket.Chat');
    }

    // Mock rooms data
    return [
      {
        id: 'general',
        name: 'general',
        type: 'channel',
        description: 'General discussion',
        unreadCount: 0,
        lastMessage: 'Welcome to the team!',
        lastMessageTime: new Date(Date.now() - 3600000),
        members: 12
      },
      {
        id: 'random',
        name: 'random',
        type: 'channel',
        description: 'Random discussions',
        unreadCount: 2,
        lastMessage: 'Anyone up for lunch?',
        lastMessageTime: new Date(Date.now() - 1800000),
        members: 8
      },
      {
        id: 'support',
        name: 'support',
        type: 'channel',
        description: 'Technical support',
        unreadCount: 0,
        lastMessage: 'Issue resolved',
        lastMessageTime: new Date(Date.now() - 7200000),
        members: 5
      }
    ];
  }

  async getMessages(roomId: string, limit = 50): Promise<RocketChatMessage[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to Rocket.Chat');
    }

    // Mock messages data
    const mockMessages: RocketChatMessage[] = [
      {
        id: '1',
        text: 'Welcome to the team chat! 🎉',
        user: {
          id: 'system',
          name: 'System',
          username: 'system',
          avatar: '/logo.png'
        },
        timestamp: new Date(Date.now() - 3600000),
        roomId,
        type: 'system'
      },
      {
        id: '2',
        text: 'Hey everyone! How is the project going?',
        user: {
          id: 'user1',
          name: 'John Doe',
          username: 'john.doe',
          avatar: undefined
        },
        timestamp: new Date(Date.now() - 1800000),
        roomId,
        type: 'message'
      },
      {
        id: '3',
        text: 'Great! We are making good progress on the frontend integration.',
        user: {
          id: this.userId || 'current_user',
          name: 'You',
          username: 'current_user',
          avatar: undefined
        },
        timestamp: new Date(Date.now() - 900000),
        roomId,
        type: 'message'
      }
    ];

    return mockMessages;
  }

  async sendMessage(roomId: string, text: string): Promise<RocketChatMessage> {
    if (!this.isConnected) {
      throw new Error('Not connected to Rocket.Chat');
    }

    const message: RocketChatMessage = {
      id: Date.now().toString(),
      text,
      user: {
        id: this.userId || 'current_user',
        name: 'You',
        username: 'current_user',
        avatar: undefined
      },
      timestamp: new Date(),
      roomId,
      type: 'message'
    };

    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.emit('message', message);
    return message;
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get currentUserId(): string | null {
    return this.userId;
  }

  get currentAuthToken(): string | null {
    return this.authToken;
  }
}

// Export singleton instance
export const rocketChatService = new RocketChatService();
