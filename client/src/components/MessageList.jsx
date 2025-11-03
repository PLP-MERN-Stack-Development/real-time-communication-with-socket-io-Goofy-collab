
import { useState } from 'react';
import './MessageList.css';

const MessageList = ({ messages, username, typingUsers, messagesEndRef }) => {
  const [reactions, setReactions] = useState({});

  const handleReaction = (messageId, emoji) => {
    setReactions((prev) => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [emoji]: (prev[messageId]?.[emoji] || 0) + 1,
      },
    }));
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const reactionEmojis = ['👍', '❤️', '😂', '🎉', '🔥'];

  return (
    <div className="message-list">
      {messages.map((msg) => {
        const isOwnMessage = msg.sender === username;
        const isSystemMessage = msg.system;

        if (isSystemMessage) {
          return (
            <div key={msg.id} className="system-message">
              {msg.message}
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
          >
            {!isOwnMessage && (
              <div className="message-avatar">
                {msg.sender.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="message-content">
              {!isOwnMessage && (
                <div className="message-sender">{msg.sender}</div>
              )}
              
              <div className="message-bubble">
                {msg.file && (
                  <div className="message-file">
                    {msg.file.type?.startsWith('image/') ? (
                      <img
                        src={msg.file.data}
                        alt="Shared"
                        className="message-image"
                      />
                    ) : (
                      <div className="file-attachment">
                        📎 {msg.file.name}
                      </div>
                    )}
                  </div>
                )}
                
                {msg.message && <div className="message-text">{msg.message}</div>}
                
                <div className="message-footer">
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                  {msg.isPrivate && (
                    <span className="private-indicator">🔒 Private</span>
                  )}
                  {isOwnMessage && msg.read && (
                    <span className="read-receipt">✓✓</span>
                  )}
                </div>
              </div>

              <div className="message-reactions">
                {reactions[msg.id] &&
                  Object.entries(reactions[msg.id]).map(([emoji, count]) => (
                    <span key={emoji} className="reaction">
                      {emoji} {count}
                    </span>
                  ))}
                <div className="reaction-picker">
                  {reactionEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      className="reaction-button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {isOwnMessage && (
              <div className="message-avatar own">
                {msg.sender.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="typing-text">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
            typing...
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;