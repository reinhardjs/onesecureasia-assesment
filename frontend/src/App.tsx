import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';

interface Domain {
  id: string;
  domain: string;
  created_at: string;
}

interface SecurityEvaluation {
  overall_status: string;
  overall_score: number;
  recommendations: string[];
  test_statuses: Record<string, string>;
  risk_level: string;
}

interface TestResult {
  dmarc?: any;
  spf?: any;
  dkim?: any;
  mail_server?: any;
  security_evaluation?: SecurityEvaluation;
}

interface User {
  id: number;
  username: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});

  // Check for existing authentication on app load
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Load domains when user is authenticated
  useEffect(() => {
    const loadDomainsForUser = async () => {
      if (token) {
        try {
          const response = await fetch('http://localhost:3001/api/domains', {
            headers: getAuthHeaders()
          });
          
          if (response.status === 401) {
            handleLogout();
            return;
          }
          
          const data = await response.json();
          setDomains(data);
        } catch (error) {
          console.error('Error fetching domains:', error);
        }
      }
    };

    loadDomainsForUser();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (authToken: string, userData: User) => {
    setToken(authToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setDomains([]);
    setTestResults({});
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchDomains = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/domains', {
        headers: getAuthHeaders()
      });
      
      if (response.status === 401) {
        handleLogout();
        return;
      }
      
      const data = await response.json();
      setDomains(data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/domains', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      
      if (response.ok) {
        setNewDomain('');
        fetchDomains();
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error adding domain:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/domains/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        fetchDomains();
        delete testResults[id];
        setTestResults({...testResults});
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  const testDomain = async (id: string) => {
    setTesting(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`http://localhost:3001/api/test/${id}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const results = await response.json();
        setTestResults(prev => ({ ...prev, [id]: results }));
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error testing domain:', error);
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#4caf50';
      case 'fail': return '#f44336';
      case 'warning': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  // Show login page if not authenticated
  if (!user || !token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>🛡️ OneSecure Domain Security Assessment</h1>
            <p>Test your domain's security configuration</p>
          </div>
          <div className="user-info">
            <span>Welcome, {user.username}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="add-domain">
          <h2>Add Domain</h2>
          <form onSubmit={addDomain}>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Enter domain (e.g., example.com)"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
        </section>

        <section className="domains">
          <h2>Domains ({domains.length})</h2>
          {domains.length === 0 ? (
            <p className="no-domains">No domains added yet. Add one above to get started.</p>
          ) : (
            <div className="domains-grid">
              {domains.map((domain) => (
                <div key={domain.id} className="domain-card">
                  <h3>{domain.domain}</h3>
                  <p className="domain-date">Added: {new Date(domain.created_at).toLocaleDateString()}</p>
                  
                  <div className="domain-actions">
                    <button 
                      onClick={() => testDomain(domain.id)}
                      disabled={testing[domain.id]}
                      className="test-btn"
                    >
                      {testing[domain.id] ? 'Testing...' : 'Run Security Test'}
                    </button>
                    <button 
                      onClick={() => deleteDomain(domain.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>

                  {testResults[domain.id] && (
                    <div className="test-results">
                      {testResults[domain.id].security_evaluation && (
                        <div className="security-overview">
                          <h4>Security Assessment</h4>
                          <div className="score-container">
                            <div className="score-circle" style={{ 
                              background: `conic-gradient(${getStatusColor(testResults[domain.id].security_evaluation!.overall_status)} ${testResults[domain.id].security_evaluation!.overall_score * 3.6}deg, #f0f0f0 0deg)`
                            }}>
                              <span className="score-text">{testResults[domain.id].security_evaluation!.overall_score}</span>
                            </div>
                            <div className="score-details">
                              <p className="overall-status" style={{ color: getStatusColor(testResults[domain.id].security_evaluation!.overall_status) }}>
                                Status: {testResults[domain.id].security_evaluation!.overall_status.toUpperCase()}
                              </p>
                              <p className="risk-level" style={{ color: getRiskLevelColor(testResults[domain.id].security_evaluation!.risk_level) }}>
                                Risk Level: {testResults[domain.id].security_evaluation!.risk_level}
                              </p>
                            </div>
                          </div>
                          
                          {testResults[domain.id].security_evaluation!.recommendations.length > 0 && (
                            <div className="recommendations">
                              <h5>Recommendations:</h5>
                              <ul>
                                {testResults[domain.id].security_evaluation!.recommendations.map((rec, index) => (
                                  <li key={index} className={rec.includes('CRITICAL') ? 'critical' : rec.includes('URGENT') ? 'urgent' : ''}>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <h4>Detailed Test Results:</h4>
                      {Object.entries(testResults[domain.id]).filter(([key]) => key !== 'security_evaluation').map(([testType, result]: [string, any]) => (
                        <div key={testType} className="test-result">
                          <span className="test-name">{testType.toUpperCase()}:</span>
                          <span 
                            className="test-status"
                            style={{ color: getStatusColor(testResults[domain.id].security_evaluation?.test_statuses[testType] || result?.status || 'unknown') }}
                          >
                            {testResults[domain.id].security_evaluation?.test_statuses[testType] || result?.status || 'unknown'}
                          </span>
                          {result?.message && (
                            <p className="test-message">{result.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
