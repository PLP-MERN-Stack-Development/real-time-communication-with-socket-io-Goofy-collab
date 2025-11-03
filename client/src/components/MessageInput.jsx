
import { useState, useRef } from 'react';
import './MessageInput.css';

const MessageInput = ({ onSendMessage, onTyping, disabled }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if ((!message.trim() && !selectedFile) || disabled) {
      return;
    }

    let fileData = null;
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          data: event.target.result,
        };
        onSendMessage(message.trim(), fileData);
        setMessage('');
        setSelectedFile(null);
        onTyping(false);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      onSendMessage(message.trim(), null);
      setMessage('');
      onTyping(false);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input-container">
      {selectedFile && (
        <div className="file-preview">
          <div className="file-info">
            {selectedFile.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="file-preview-image"
              />
            ) : (
              <div className="file-icon">📎</div>
            )}
            <span className="file-name">{selectedFile.name}</span>
          </div>
          <button
            type="button"
            onClick={handleFileRemove}
            className="file-remove"
          >
            ✕
          </button>
        </div>
      )}

      <div className="input-wrapper">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="attach-button"
          disabled={disabled}
          title="Attach file"
        >
          📎
        </button>

        <textarea
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? 'Disconnected...' : 'Type a message...'}
          disabled={disabled}
          className="message-textarea"
          rows="1"
        />

        <button
          type="submit"
          disabled={(!message.trim() && !selectedFile) || disabled}
          className="send-button"
        >
          <span className="send-icon">➤</span>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;