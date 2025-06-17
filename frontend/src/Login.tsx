import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = showRegister ? '/api/auth/register' : '/api/auth/login';
      const body = showRegister 
        ? { username, email, password }
        : { username, password };

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🛡️ OneSecure</h2>
          <p>Domain Security Assessment Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h3>{showRegister ? 'Create Account' : 'Sign In'}</h3>
          
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {showRegister && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? 'Please wait...' : (showRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="login-footer">
          <button 
            type="button" 
            onClick={() => setShowRegister(!showRegister)}
            className="toggle-button"
            disabled={isLoading}
          >
            {showRegister ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
          
          {!showRegister && (
            <div className="demo-credentials">
              <small>Demo: admin / admin123</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;