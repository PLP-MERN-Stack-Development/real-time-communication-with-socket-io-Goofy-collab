
import { io } from 'socket.io-client';
import { useEffect, useState, useCallback, useRef } from 'react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [unreadCount, setUnreadCount] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  
  const usernameRef = useRef('');
  const reconnectAttemptsRef = useRef(0);

  // Connect to socket server
  const connect = useCallback((username) => {
    usernameRef.current = username;
    socket.connect();
    socket.emit('user_join', username);
  }, []);

  // Disconnect from socket server
  const disconnect = useCallback(() => {
    socket.disconnect();
    setMessages([]);
    setUsers([]);
    setTypingUsers([]);
  }, []);

  // Join a room
  const joinRoom = useCallback((room) => {
    socket.emit('join_room', room);
    setCurrentRoom(room);
  }, []);

  // Send a message
  const sendMessage = useCallback((message, file = null, room = currentRoom) => {
    if (!socket.connected) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('send_message', { message, file, room });
  }, [currentRoom]);

  // Send a private message
  const sendPrivateMessage = useCallback((to, message, file = null) => {
    if (!socket.connected) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('private_message', { to, message, file });
  }, []);

  // Set typing status
  const setTyping = useCallback((isTyping) => {
    if (!socket.connected) return;
    socket.emit('typing', isTyping);
  }, []);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId, room) => {
    if (!socket.connected) return;
    socket.emit('message_read', { messageId, room });
  }, []);

  // Add reaction to message
  const addReaction = useCallback((messageId, emoji, room) => {
    if (!socket.connected) return;
    socket.emit('add_reaction', { messageId, emoji, room });
  }, []);

  // Request older messages (pagination)
  const requestMessages = useCallback((room, before = null, limit = 20) => {
    if (!socket.connected) return;
    socket.emit('request_messages', { room, before, limit });
  }, []);

  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      console.log('Connected to server');
      setIsConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;

      // Rejoin if reconnecting
      if (usernameRef.current) {
        socket.emit('reconnect_user', usernameRef.current);
      }
    };

    const onDisconnect = (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, manual reconnect needed
        socket.connect();
      }
    };

    const onConnectError = (error) => {
      console.error('Connection error:', error);
      setReconnecting(true);
    };

    const onReconnectAttempt = (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      setReconnecting(true);
      reconnectAttemptsRef.current = attemptNumber;
    };

    const onReconnectFailed = () => {
      console.error('Reconnection failed');
      setReconnecting(false);
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
      
      // Update unread count if window is not focused
      if (document.hidden) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
      
      if (document.hidden) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const onMessageHistory = ({ room, messages: historyMessages }) => {
      setMessages((prev) => {
        // Merge with existing messages, avoiding duplicates
        const existingIds = new Set(prev.map(m => m.id));
        const newMessages = historyMessages.filter(m => !existingIds.has(m.id));
        return [...newMessages, ...prev].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
    };

    const onMessageDelivered = ({ id, timestamp }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, delivered: true, deliveredAt: timestamp } : msg
        )
      );
    };

    const onMessageReadReceipt = ({ messageId, readBy, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                read: true,
                readBy: [...(msg.readBy || []), { username: readBy, readAt }],
              }
            : msg
        )
      );
    };

    // User events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: user.timestamp || new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          system: true,
          message: `${user.username} left the chat`,
          timestamp: user.timestamp || new Date().toISOString(),
        },
      ]);
    };

    // Typing events
    const onTypingUsers = ({ room, users: typingUsersList }) => {
      if (room === currentRoom) {
        setTypingUsers(typingUsersList || []);
      }
    };

    // Reaction events
    const onReactionAdded = ({ messageId, emoji, username }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || {};
            const reactionList = reactions[emoji] || [];
            return {
              ...msg,
              reactions: {
                ...reactions,
                [emoji]: [...reactionList, username],
              },
            };
          }
          return msg;
        })
      );
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect_failed', onReconnectFailed);
    
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('message_history', onMessageHistory);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('message_read_receipt', onMessageReadReceipt);
    
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    
    socket.on('typing_users', onTypingUsers);
    socket.on('reaction_added', onReactionAdded);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect_failed', onReconnectFailed);
      
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('message_history', onMessageHistory);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('message_read_receipt', onMessageReadReceipt);
      
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      
      socket.off('typing_users', onTypingUsers);
      socket.off('reaction_added', onReactionAdded);
    };
  }, [currentRoom]);

  // Clear unread count when window is focused
  useEffect(() => {
    const handleFocus = () => {
      setUnreadCount(0);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return {
    socket,
    isConnected,
    reconnecting,
    lastMessage,
    messages,
    users,
    typingUsers,
    currentRoom,
    unreadCount,
    connect,
    disconnect,
    joinRoom,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    markMessageAsRead,
    addReaction,
    requestMessages,
  };
};

export default socket;

