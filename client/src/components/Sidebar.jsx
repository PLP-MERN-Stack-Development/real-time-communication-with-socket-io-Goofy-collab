
import './Sidebar.css';

const Sidebar = ({
  username,
  users,
  rooms,
  currentRoom,
  selectedUser,
  onRoomChange,
  onUserSelect,
  onLogout,
  isConnected,
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-info">
          <div className="avatar">{username.charAt(0).toUpperCase()}</div>
          <div>
            <div className="username">{username}</div>
            <div className={`status ${isConnected ? 'online' : 'offline'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="logout-button" title="Logout">
          🚪
        </button>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title">Rooms</h3>
        <div className="room-list">
          {rooms.map((room) => (
            <div
              key={room}
              className={`room-item ${currentRoom === room && !selectedUser ? 'active' : ''}`}
              onClick={() => onRoomChange(room)}
            >
              <span className="room-icon">#</span>
              <span className="room-name">{room}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title">
          Online Users ({users.filter(u => u.username !== username).length})
        </h3>
        <div className="user-list">
          {users
            .filter((user) => user.username !== username)
            .map((user) => (
              <div
                key={user.id}
                className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
                onClick={() => onUserSelect(user)}
              >
                <div className="user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <div className="user-name">{user.username}</div>
                  <div className="user-status">
                    <span className="status-dot online"></span>
                    Online
                  </div>
                </div>
              </div>
            ))}
          {users.filter(u => u.username !== username).length === 0 && (
            <div className="empty-state">No other users online</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;