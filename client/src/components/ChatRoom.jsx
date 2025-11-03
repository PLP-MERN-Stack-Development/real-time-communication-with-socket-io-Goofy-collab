
import { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './ChatRoom.css';

const ChatRoom = ({
  username,
  messages,
  typingUsers,
  currentRoom,
  selectedUser,
  sendMessage,
  sendPrivateMessage,
  setTyping,
  isConnected,
}) => {
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Filter messages based on current room or private chat
  useEffect(() => {
    if (selectedUser) {
      // Show private messages
      setFilteredMessages(
        messages.filter(
          (msg) =>
            msg.isPrivate &&
            ((msg.sender === username && msg.to === selectedUser.username) ||
              (msg.sender === selectedUser.username && msg.to === username))
        )
      );
    } else {
      // Show room messages
      setFilteredMessages(
        messages.filter(
          (msg) => !msg.isPrivate && (!msg.room || msg.room === currentRoom)
        )
      );
    }
  }, [messages, currentRoom, selectedUser, username]);

  // Search messages
  const displayedMessages = searchQuery
    ? filteredMessages.filter((msg) =>
        msg.message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredMessages;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  // Show notification for new messages
  useEffect(() => {
    if (filteredMessages.length > 0) {
      const lastMessage = filteredMessages[filteredMessages.length - 1];
      
      if (
        lastMessage.sender !== username &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        new Notification(`New message from ${lastMessage.sender}`, {
          body: lastMessage.message,
          icon: '/chat-icon.png',
        });
        
        // Play sound
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      }
    }
  }, [filteredMessages, username]);

  const handleSendMessage = (message, file) => {
    if (selectedUser) {
      sendPrivateMessage(selectedUser.id, message, file);
    } else {
      sendMessage(message, file, currentRoom);
    }
  };

  const handleTyping = (isTyping) => {
    setTyping(isTyping);
    
    if (isTyping) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  };

  const getChatTitle = () => {
    if (selectedUser) {
      return (
        <div className="chat-title">
          <span className="title-icon">👤</span>
          <span>{selectedUser.username}</span>
          <span className="badge private-badge">Private</span>
        </div>
      );
    }
    return (
      <div className="chat-title">
        <span className="title-icon">#</span>
        <span>{currentRoom}</span>
      </div>
    );
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        {getChatTitle()}
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? ' Connected' : ' Disconnected'}
          </div>
        </div>
      </div>

      <MessageList
        messages={displayedMessages}
        username={username}
        typingUsers={typingUsers}
        messagesEndRef={messagesEndRef}
      />

      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={!isConnected}
      />
    </div>
  );
};

export default ChatRoom;