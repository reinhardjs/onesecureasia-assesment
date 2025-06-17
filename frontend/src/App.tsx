import React, { useState, useEffect } from 'react';
import './App.css';

interface Domain {
  id: string;
  domain: string;
  createdAt: string;
}

interface TestResult {
  dmarc?: any;
  spf?: any;
  dkim?: any;
  mail_server?: any;
}

function App() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: TestResult }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/domains');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      
      if (response.ok) {
        setNewDomain('');
        fetchDomains();
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
      });
      
      if (response.ok) {
        fetchDomains();
        delete testResults[id];
        setTestResults({...testResults});
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
      });
      
      if (response.ok) {
        const results = await response.json();
        setTestResults(prev => ({ ...prev, [id]: results }));
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

  return (
    <div className="App">
      <header className="app-header">
        <h1>🛡️ OneSecure Domain Security Assessment</h1>
        <p>Test your domain's security configuration</p>
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
                  <p className="domain-date">Added: {new Date(domain.createdAt).toLocaleDateString()}</p>
                  
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
                      <h4>Test Results:</h4>
                      {Object.entries(testResults[domain.id]).map(([testType, result]: [string, any]) => (
                        <div key={testType} className="test-result">
                          <span className="test-name">{testType.toUpperCase()}:</span>
                          <span 
                            className="test-status"
                            style={{ color: getStatusColor(result?.status || 'unknown') }}
                          >
                            {result?.status || 'unknown'}
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
