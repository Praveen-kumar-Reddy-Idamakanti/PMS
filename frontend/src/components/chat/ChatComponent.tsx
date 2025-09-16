import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

// Rocket.Chat configuration
const ROCKET_CHAT_URL = import.meta.env.VITE_ROCKET_CHAT_URL || 'https://your-rocket-chat-server.com';
const ROCKET_CHAT_IFRAME_URL = `${ROCKET_CHAT_URL}/channel/general`;

interface ChatMessage {
  id: string;
  text: string;
  user: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  isOwn: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'channel' | 'direct' | 'group';
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export function ChatComponent() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRoom, setActiveRoom] = useState<string>('general');
  const [rooms, setRooms] = useState<ChatRoom[]>([
    { id: 'general', name: 'General', type: 'channel', unreadCount: 0 },
    { id: 'random', name: 'Random', type: 'channel', unreadCount: 2 },
    { id: 'support', name: 'Support', type: 'channel', unreadCount: 0 },
  ]);
  const [showRooms, setShowRooms] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock connection status
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock messages for demonstration
  useEffect(() => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        text: 'Welcome to the team chat! 🎉',
        user: { name: 'System', avatar: '/logo.png' },
        timestamp: new Date(Date.now() - 3600000),
        isOwn: false,
      },
      {
        id: '2',
        text: 'Hey everyone! How is the project going?',
        user: { name: 'John Doe', avatar: undefined },
        timestamp: new Date(Date.now() - 1800000),
        isOwn: false,
      },
      {
        id: '3',
        text: 'Great! We are making good progress on the frontend integration.',
        user: { name: user?.name || 'You', avatar: undefined },
        timestamp: new Date(Date.now() - 900000),
        isOwn: true,
      },
    ];
    setMessages(mockMessages);
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage,
      user: { name: user?.name || 'You' },
      timestamp: new Date(),
      isOwn: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Rooms Sidebar */}
      <div className={cn(
        "w-64 border-r bg-muted/30 transition-all duration-300",
        showRooms ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Channels</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRooms(!showRooms)}
              className="md:hidden"
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                  activeRoom === room.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setActiveRoom(room.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">#{room.name}</p>
                    {room.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate max-w-32">
                        {room.lastMessage}
                      </p>
                    )}
                  </div>
                </div>
                {room.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {room.unreadCount}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRooms(!showRooms)}
                className="md:hidden"
              >
                <Users className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="font-semibold">#{rooms.find(r => r.id === activeRoom)?.name}</h2>
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex space-x-3",
                  message.isOwn ? "flex-row-reverse space-x-reverse" : ""
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.user.avatar} />
                  <AvatarFallback className="text-xs">
                    {getInitials(message.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex-1 max-w-[70%]",
                  message.isOwn ? "flex flex-col items-end" : ""
                )}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium">{message.user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    message.isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}>
                    {message.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



