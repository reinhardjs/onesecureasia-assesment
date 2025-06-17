const { Pool } = require('pg');

// In-memory storage for fallback
let inMemoryDb = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'admin@onesecure.com',
      password_hash: '$2b$10$FGFE6.1eTJrDie03mXGTf.64Qtts7DyNGk/7q8gsLaNMVna1ZY4hC', // admin123
      created_at: new Date(),
      last_login: null
    }
  ],
  domains: [],
  test_results: []
};
let useInMemory = false;

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'onesecure_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Database wrapper that handles both PostgreSQL and in-memory storage
const query = async (text, params) => {
  if (useInMemory) {
    // In-memory query simulation
    if (text.toLowerCase().includes('select count(*) from users')) {
      return { rows: [{ count: inMemoryDb.users.length }] };
    }
    if (text.toLowerCase().includes('select * from users where username')) {
      const username = params[0];
      const user = inMemoryDb.users.find(u => u.username === username);
      return { rows: user ? [user] : [] };
    }
    if (text.toLowerCase().includes('select * from users where email')) {
      const email = params[0];
      const user = inMemoryDb.users.find(u => u.email === email);
      return { rows: user ? [user] : [] };
    }
    if (text.toLowerCase().includes('insert into users')) {
      const [username, email, password_hash] = params;
      const newUser = {
        id: inMemoryDb.users.length + 1,
        username,
        email,
        password_hash,
        created_at: new Date(),
        last_login: null
      };
      inMemoryDb.users.push(newUser);
      return { rows: [newUser] };
    }
    if (text.toLowerCase().includes('update users set last_login')) {
      // Just return success for login updates
      return { rows: [] };
    }
    if (text.toLowerCase().includes('insert into domains')) {
      const [domain, user_id] = params;
      const newDomain = {
        id: inMemoryDb.domains.length + 1,
        domain,
        user_id,
        created_at: new Date(),
        updated_at: new Date()
      };
      inMemoryDb.domains.push(newDomain);
      return { rows: [newDomain] };
    }
    if (text.toLowerCase().includes('select * from domains where user_id')) {
      const user_id = params[0];
      const domains = inMemoryDb.domains.filter(d => d.user_id === user_id);
      return { rows: domains };
    }
    if (text.toLowerCase().includes('select * from domains where id')) {
      const id = params[0];
      const domain = inMemoryDb.domains.find(d => d.id === parseInt(id));
      return { rows: domain ? [domain] : [] };
    }
    if (text.toLowerCase().includes('insert into test_results')) {
      const [domain_id, test_type, status, results, recommendations] = params;
      const newResult = {
        id: inMemoryDb.test_results.length + 1,
        domain_id,
        test_type,
        status,
        results: typeof results === 'string' ? JSON.parse(results) : results,
        recommendations,
        created_at: new Date()
      };
      inMemoryDb.test_results.push(newResult);
      return { rows: [newResult] };
    }
    if (text.toLowerCase().includes('select * from test_results where domain_id')) {
      const domain_id = params[0];
      const results = inMemoryDb.test_results.filter(r => r.domain_id === parseInt(domain_id));
      return { rows: results };
    }
    return { rows: [] };
  }
  
  return pool.query(text, params);
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create domains table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create test_results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
        test_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        results JSONB NOT NULL,
        recommendations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin user if none exists
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
        ['admin', 'admin@onesecure.com', hashedPassword]
      );
      
      console.log('Default admin user created - username: admin, password: admin123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    // Use in-memory storage as fallback if database is not available
    useInMemory = true;
    console.log('Falling back to in-memory storage');
    console.log('Default admin user available - username: admin, password: admin123');
  }
};

module.exports = { pool, query, initializeDatabase };
