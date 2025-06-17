const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

let domains = [];
let testResults = {};

// Routes
app.get('/api/domains', (req, res) => {
  res.json(domains);
});

app.post('/api/domains', (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }
  
  const newDomain = {
    id: Date.now().toString(),
    domain,
    createdAt: new Date().toISOString()
  };
  
  domains.push(newDomain);
  res.json(newDomain);
});

app.delete('/api/domains/:id', (req, res) => {
  const { id } = req.params;
  domains = domains.filter(d => d.id !== id);
  delete testResults[id];
  res.json({ success: true });
});

app.post('/api/test/:domainId', async (req, res) => {
  const { domainId } = req.params;
  const domain = domains.find(d => d.id === domainId);
  
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  // Run security tests
  try {
    const results = await runSecurityTests(domain.domain);
    testResults[domainId] = results;
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Test failed', message: error.message });
  }
});

app.get('/api/test/:domainId', (req, res) => {
  const { domainId } = req.params;
  const results = testResults[domainId];
  
  if (!results) {
    return res.status(404).json({ error: 'No test results found' });
  }
  
  res.json(results);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3001;

// Function to run security tests using Python scripts
async function runSecurityTests(domain) {
  const pythonPath = path.join(__dirname, '../../python-tests');
  const results = {};

  const tests = [
    { name: 'dmarc', file: 'test_dmarc.py' },
    { name: 'spf', file: 'test_spf.py' },
    { name: 'dkim', file: 'test_dkim.py' },
    { name: 'mail_server', file: 'test_mail_server.py' }
  ];

  for (const test of tests) {
    try {
      const result = await runPythonScript(pythonPath, test.file, domain);
      results[test.name] = JSON.parse(result);
    } catch (error) {
      results[test.name] = { error: error.message, status: 'fail' };
    }
  }

  return results;
}

// Helper function to run Python scripts
function runPythonScript(scriptPath, scriptName, domain) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [path.join(scriptPath, scriptName), domain]);
    let data = '';
    let error = '';

    python.stdout.on('data', (chunk) => {
      data += chunk;
    });

    python.stderr.on('data', (chunk) => {
      error += chunk;
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(error || 'Python script failed'));
      } else {
        resolve(data.trim());
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
