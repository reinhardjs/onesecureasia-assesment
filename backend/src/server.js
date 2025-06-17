require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const bcrypt = require('bcryptjs');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { pool, query, initializeDatabase } = require('./database');
const { authenticateToken, generateToken } = require('./auth');
const { evaluateSecurityStatus } = require('./security-evaluator');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from frontend build (for production)
const frontendPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendPath));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OneSecure Domain Security API',
      version: '1.0.0',
      description: 'API for domain security assessment including DMARC, SPF, DKIM, and mail server testing',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/server.js'],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize database on startup
initializeDatabase();

// Fallback in-memory storage for when DB is not available
let domains = [];
let testResults = {};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = generateToken(user.id, user.username);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User already exists
 */
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password required' });
  }

  try {
    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.username);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/domains:
 *   get:
 *     summary: Get user domains
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user domains
 */
app.get('/api/domains', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Database error, using fallback:', error);
    // Fallback to in-memory storage
    res.json(domains);
  }
});

/**
 * @swagger
 * /api/domains:
 *   post:
 *     summary: Add new domain
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               domain:
 *                 type: string
 *     responses:
 *       201:
 *         description: Domain added successfully
 */
app.post('/api/domains', authenticateToken, async (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const result = await query(
      'INSERT INTO domains (domain, user_id) VALUES ($1, $2) RETURNING *',
      [domain, req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Database error, using fallback:', error);
    // Fallback to in-memory storage
    const newDomain = {
      id: Date.now().toString(),
      domain,
      created_at: new Date().toISOString()
    };
    domains.push(newDomain);
    res.status(201).json(newDomain);
  }
});

/**
 * @swagger
 * /api/domains/{id}:
 *   delete:
 *     summary: Delete domain
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Domain deleted successfully
 */
app.delete('/api/domains/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await query(
      'DELETE FROM domains WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Database error, using fallback:', error);
    // Fallback to in-memory storage
    domains = domains.filter(d => d.id !== id);
    delete testResults[id];
    res.json({ success: true });
  }
});

/**
 * @swagger
 * /api/test/{domainId}:
 *   post:
 *     summary: Run security tests for domain
 *     tags: [Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test results with security evaluation
 */
app.post('/api/test/:domainId', authenticateToken, async (req, res) => {
  const { domainId } = req.params;
  
  let domain;
  try {
    const result = await query(
      'SELECT * FROM domains WHERE id = $1 AND user_id = $2',
      [domainId, req.user.userId]
    );
    domain = result.rows[0];
  } catch (error) {
    console.error('Database error, using fallback:', error);
    domain = domains.find(d => d.id === domainId);
  }
  
  if (!domain) {
    return res.status(404).json({ error: 'Domain not found' });
  }

  // Run security tests
  try {
    const results = await runSecurityTests(domain.domain);
    
    let evaluation;
    
    // Check if we have a test_runner evaluation from Python
    if (results._test_runner_evaluation) {
      // Use the evaluation from test_runner.py
      evaluation = results._test_runner_evaluation;
      // Remove the temp property
      delete results._test_runner_evaluation;
    } else {
      // Fall back to JavaScript evaluation
      evaluation = evaluateSecurityStatus(results);
    }
    
    const responseData = {
      ...results,
      security_evaluation: evaluation
    };

    // Store results in database
    try {
      await query(
        'INSERT INTO test_results (domain_id, test_type, status, results, recommendations) VALUES ($1, $2, $3, $4, $5)',
        [domainId, 'comprehensive', evaluation.overall_status, JSON.stringify(responseData), evaluation.recommendations.join('\n')]
      );
    } catch (dbError) {
      console.error('Failed to store test results in database:', dbError);
      // Continue with in-memory storage
      testResults[domainId] = responseData;
    }
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Test failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/test/{domainId}:
 *   get:
 *     summary: Get test results for domain
 *     tags: [Testing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest test results
 */
app.get('/api/test/:domainId', authenticateToken, async (req, res) => {
  const { domainId } = req.params;
  
  try {
    const result = await query(
      'SELECT * FROM test_results WHERE domain_id = $1 ORDER BY created_at DESC LIMIT 1',
      [domainId]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0].results);
    } else {
      // Fallback to in-memory storage
      const results = testResults[domainId];
      if (!results) {
        return res.status(404).json({ error: 'No test results found' });
      }
      res.json(results);
    }
  } catch (error) {
    console.error('Database error, using fallback:', error);
    const results = testResults[domainId];
    if (!results) {
      return res.status(404).json({ error: 'No test results found' });
    }
    res.json(results);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

// Function to run security tests using test_runner.py
async function runSecurityTests(domain) {
  const pythonPath = path.join(__dirname, '../../python-tests');
  
  try {
    // Use test_runner.py with --json-only flag to get only JSON output
    const result = await runPythonScript(pythonPath, 'test_runner.py', [domain, '--json-only']);
    const parsedResult = JSON.parse(result);
    
    // Extract test results and security evaluation
    const { dmarc, spf, dkim, mail_server, security_evaluation } = parsedResult;
    
    return {
      dmarc,
      spf,
      dkim,
      mail_server,
      // The security_evaluation from test_runner.py will be merged with any additional
      // evaluations done by security-evaluator.js in the API endpoint
      _test_runner_evaluation: security_evaluation 
    };
  } catch (error) {
    console.error('Test runner error:', error);
    // Fallback to individual tests if test_runner.py fails
    return runIndividualTests(domain);
  }
}

// Fallback function to run individual tests (original implementation)
async function runIndividualTests(domain) {
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
function runPythonScript(scriptPath, scriptName, args) {
  return new Promise((resolve, reject) => {
    // Handle both string and array arguments
    const scriptArgs = Array.isArray(args) ? args : [args];
    
    console.log(`Running ${scriptName} with args: ${scriptArgs.join(' ')}`);
    
    // Construct full command arguments with script path first, then additional args
    const commandArgs = [path.join(scriptPath, scriptName), ...scriptArgs];
    
    const python = spawn('python3', commandArgs);
    let data = '';
    let error = '';
    
    // Set a timeout for the Python script execution
    const timeout = setTimeout(() => {
      python.kill();
      reject(new Error(`Python script ${scriptName} timed out after 60 seconds`));
    }, 60000); // Increase timeout to 60 seconds

    python.stdout.on('data', (chunk) => {
      data += chunk;
    });

    python.stderr.on('data', (chunk) => {
      error += chunk;
    });

    python.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code !== 0) {
        console.error(`${scriptName} failed with code ${code}:`, error);
        reject(new Error(error || `Python script ${scriptName} failed with code ${code}`));
      } else {
        try {
          // Try to parse as JSON to validate
          const trimmedData = data.trim();
          JSON.parse(trimmedData);
          resolve(trimmedData);
        } catch (e) {
          console.error(`Failed to parse JSON from ${scriptName}:`, e);
          console.error(`Raw output:`, data);
          reject(new Error(`Invalid JSON output from ${scriptName}`));
        }
      }
    });
    
    // Handle process error
    python.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`Error executing ${scriptName}:`, err);
      reject(new Error(`Failed to execute ${scriptName}: ${err.message}`));
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the app for server startup and runSecurityTests for testing
module.exports = { 
  app
};
