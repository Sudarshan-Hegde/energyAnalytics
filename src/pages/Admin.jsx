import { useState } from 'react';
import './Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  const users = [
    { id: 1, name: 'John Doe', email: 'john@smartgrid.com', role: 'Admin', status: 'Active', lastLogin: '2 hours ago' },
    { id: 2, name: 'Jane Smith', email: 'jane@smartgrid.com', role: 'Operator', status: 'Active', lastLogin: '1 day ago' },
    { id: 3, name: 'Mike Johnson', email: 'mike@smartgrid.com', role: 'Analyst', status: 'Active', lastLogin: '3 hours ago' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@smartgrid.com', role: 'Operator', status: 'Inactive', lastLogin: '5 days ago' },
  ];

  const devices = [
    { id: 1, name: 'Sensor-Node-001', type: 'Power Meter', location: 'Zone A', status: 'Online', battery: 87 },
    { id: 2, name: 'Sensor-Node-002', type: 'Voltage Monitor', location: 'Zone B', status: 'Online', battery: 92 },
    { id: 3, name: 'Sensor-Node-003', type: 'Current Sensor', location: 'Zone C', status: 'Offline', battery: 15 },
    { id: 4, name: 'Sensor-Node-004', type: 'Power Meter', location: 'Zone D', status: 'Online', battery: 78 },
  ];

  const systemLogs = [
    { id: 1, timestamp: '2024-12-16 14:32:15', type: 'INFO', message: 'System backup completed successfully', user: 'System' },
    { id: 2, timestamp: '2024-12-16 14:15:42', type: 'WARNING', message: 'High load detected on Substation D', user: 'Monitor' },
    { id: 3, timestamp: '2024-12-16 13:58:30', type: 'INFO', message: 'User login: john@smartgrid.com', user: 'John Doe' },
    { id: 4, timestamp: '2024-12-16 13:45:18', type: 'ERROR', message: 'Connection lost to Sensor-Node-003', user: 'System' },
    { id: 5, timestamp: '2024-12-16 13:30:05', type: 'INFO', message: 'Configuration updated for Zone A', user: 'Jane Smith' },
  ];

  const systemStats = [
    { label: 'Total Users', value: '24', change: '+2', icon: '👥' },
    { label: 'Active Devices', value: '247', change: '+5', icon: '📡' },
    { label: 'System Uptime', value: '99.9%', change: '0%', icon: '⚡' },
    { label: 'Data Points/sec', value: '15.2k', change: '+12%', icon: '📊' },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>System Administration</h1>
          <p>Manage users, devices, and system configurations</p>
        </div>
        <button className="primary-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add New
        </button>
      </div>

      <div className="stats-overview">
        {systemStats.map((stat, index) => (
          <div key={index} className="stat-box">
            <div className="stat-icon-box">{stat.icon}</div>
            <div className="stat-details">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'neutral'}`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-content">
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Users
            </button>
            <button 
              className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveTab('devices')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/>
                <line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
              Devices
            </button>
            <button 
              className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              System Logs
            </button>
            <button 
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>
              </svg>
              Settings
            </button>
          </div>

          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'users' && (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{user.name.charAt(0)}</div>
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.status.toLowerCase()}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{user.lastLogin}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="icon-btn" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Device Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Battery</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id}>
                      <td>
                        <div className="device-cell">
                          <div className="device-icon">📡</div>
                          <span>{device.name}</span>
                        </div>
                      </td>
                      <td>{device.type}</td>
                      <td>{device.location}</td>
                      <td>
                        <span className={`status-badge ${device.status.toLowerCase()}`}>
                          {device.status}
                        </span>
                      </td>
                      <td>
                        <div className="battery-cell">
                          <div className="battery-bar">
                            <div 
                              className={`battery-fill ${device.battery < 30 ? 'low' : device.battery < 60 ? 'medium' : 'high'}`}
                              style={{ width: `${device.battery}%` }}
                            ></div>
                          </div>
                          <span>{device.battery}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn" title="Configure">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3"/>
                              <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>
                            </svg>
                          </button>
                          <button className="icon-btn" title="Restart">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="23 4 23 10 17 10"/>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="logs-container">
              {systemLogs.map(log => (
                <div key={log.id} className={`log-entry ${log.type.toLowerCase()}`}>
                  <div className="log-indicator"></div>
                  <div className="log-content">
                    <div className="log-header">
                      <span className={`log-type ${log.type.toLowerCase()}`}>{log.type}</span>
                      <span className="log-timestamp">{log.timestamp}</span>
                    </div>
                    <div className="log-message">{log.message}</div>
                    <div className="log-user">User: {log.user}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-container">
              <div className="settings-section">
                <h3>General Settings</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>System Notifications</label>
                    <p>Receive alerts for critical system events</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Auto Backup</label>
                    <p>Automatically backup system data daily</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Data Retention</label>
                    <p>Keep historical data for analysis</p>
                  </div>
                  <select className="settings-select">
                    <option>30 days</option>
                    <option>90 days</option>
                    <option selected>180 days</option>
                    <option>1 year</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>Security Settings</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Two-Factor Authentication</label>
                    <p>Require 2FA for all admin users</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Session Timeout</label>
                    <p>Automatically logout inactive users</p>
                  </div>
                  <select className="settings-select">
                    <option>15 minutes</option>
                    <option selected>30 minutes</option>
                    <option>1 hour</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>Integration Settings</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>FastAPI Endpoint</label>
                    <p>Backend API server URL</p>
                  </div>
                  <input 
                    type="text" 
                    className="settings-input" 
                    placeholder="https://api.smartgrid.com"
                    defaultValue="http://localhost:8000"
                  />
                </div>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Kafka Broker</label>
                    <p>Real-time data streaming endpoint</p>
                  </div>
                  <input 
                    type="text" 
                    className="settings-input" 
                    placeholder="localhost:9092"
                    defaultValue="kafka.smartgrid.com:9092"
                  />
                </div>
              </div>

              <div className="settings-actions">
                <button className="secondary-btn">Reset to Defaults</button>
                <button className="primary-btn">Save Changes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
