
import { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (username.length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }
    
    onLogin(username.trim());
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Socket.io Chat</h1>
          <p>Enter your username to start chatting</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className={error ? 'input-error' : ''}
              autoFocus
            />
            {error && <span className="error-message">{error}</span>}
          </div>
          
          <button type="submit" className="login-button">
            Join Chat
          </button>
        </form>
        
        <div className="login-footer">
          <p>Real-time messaging powered by Socket.io</p>
        </div>
      </div>
    </div>
  );
};

export default Login;