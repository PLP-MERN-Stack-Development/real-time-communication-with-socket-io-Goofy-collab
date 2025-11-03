
import { useState, useEffect } from 'react';
import { useSocket } from './socket/socket';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [rooms, setRooms] = useState(['general', 'random', 'tech']);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const {
    isConnected,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
  } = useSocket();

  const handleLogin = (name) => {
    setUsername(name);
    connect(name);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    disconnect();
    setIsLoggedIn(false);
    setUsername('');
    setCurrentRoom('general');
    setSelectedUser(null);
  };

  const handleRoomChange = (room) => {
    setCurrentRoom(room);
    setSelectedUser(null);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setCurrentRoom(null);
  };

  // Request notification permission
  useEffect(() => {
    if (isLoggedIn && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        username={username}
        users={users}
        rooms={rooms}
        currentRoom={currentRoom}
        selectedUser={selectedUser}
        onRoomChange={handleRoomChange}
        onUserSelect={handleUserSelect}
        onLogout={handleLogout}
        isConnected={isConnected}
      />
      <ChatRoom
        username={username}
        messages={messages}
        users={users}
        typingUsers={typingUsers}
        currentRoom={currentRoom}
        selectedUser={selectedUser}
        sendMessage={sendMessage}
        sendPrivateMessage={sendPrivateMessage}
        setTyping={setTyping}
        isConnected={isConnected}
      />
    </div>
  );
}

export default App;

