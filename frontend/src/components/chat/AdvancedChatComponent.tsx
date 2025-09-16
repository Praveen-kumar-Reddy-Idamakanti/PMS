import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send, MessageCircle, Users, Settings, Wifi, WifiOff, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rocketChatService, RocketChatMessage, RocketChatRoom, RocketChatConfig } from '@/services/rocketChat.service';

export function AdvancedChatComponent() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<RocketChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRoom, setActiveRoom] = useState<string>('general');
  const [rooms, setRooms] = useState<RocketChatRoom[]>([]);
  const [showRooms, setShowRooms] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<Partial<RocketChatConfig>>({
    serverUrl: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize connection
  useEffect(() => {
    const initConnection = async () => {
      setLoading(true);
      try {
        const connected = await rocketChatService.connect();
        setIsConnected(connected);
        
        if (connected) {
          await loadRooms();
          await loadMessages(activeRoom);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initConnection();

    // Set up event listeners
    const handleMessage = (message: RocketChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const handleConnected = () => {
      setIsConnected(true);
      loadRooms();
      loadMessages(activeRoom);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    rocketChatService.on('message', handleMessage);
    rocketChatService.on('connected', handleConnected);
    rocketChatService.on('disconnected', handleDisconnected);

    return () => {
      rocketChatService.off('message', handleMessage);
      rocketChatService.off('connected', handleConnected);
      rocketChatService.off('disconnected', handleDisconnected);
    };
  }, []);

  const loadRooms = async () => {
    try {
      const roomsData = await rocketChatService.getRooms();
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const messagesData = await rocketChatService.getMessages(roomId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected) return;

    try {
      await rocketChatService.sendMessage(activeRoom, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRoomChange = async (roomId: string) => {
    setActiveRoom(roomId);
    await loadMessages(roomId);
  };

  const handleConnect = async () => {
    if (!config.serverUrl || !config.username || !config.password) {
      alert('Please fill in all configuration fields');
      return;
    }

    setLoading(true);
    try {
      const connected = await rocketChatService.connect(config as RocketChatConfig);
      setIsConnected(connected);
      setShowConfig(false);
      
      if (connected) {
        await loadRooms();
        await loadMessages(activeRoom);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to Rocket.Chat server');
    } finally {
      setLoading(false);
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

  const currentRoom = rooms.find(room => room.id === activeRoom);

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
            <div className="flex items-center space-x-2">
              <Dialog open={showConfig} onOpenChange={setShowConfig}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rocket.Chat Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="serverUrl">Server URL</Label>
                      <Input
                        id="serverUrl"
                        value={config.serverUrl}
                        onChange={(e) => setConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                        placeholder="https://your-rocket-chat-server.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={config.username}
                        onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={config.password}
                        onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Your password"
                      />
                    </div>
                    <Button onClick={handleConnect} disabled={loading} className="w-full">
                      {loading ? 'Connecting...' : 'Connect'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                onClick={() => handleRoomChange(room.id)}
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
                <h2 className="font-semibold">
                  #{currentRoom?.name || 'general'}
                </h2>
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentRoom?.members && (
                <span className="text-xs text-muted-foreground">
                  {currentRoom.members} members
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-3",
                    message.user.id === rocketChatService.currentUserId ? "flex-row-reverse space-x-reverse" : ""
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
                    message.user.id === rocketChatService.currentUserId ? "flex flex-col items-end" : ""
                  )}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">{message.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      message.user.id === rocketChatService.currentUserId
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
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
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




