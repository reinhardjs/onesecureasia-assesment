# OneSecure Asia - Domain Security Assessment Platform

A comprehensive full-stack application for testing domain security configurations including DMARC, SPF, DKIM, and mail server security assessments.

## 🚩 Launch Options

- `./start-dev.sh` - Run in standard mode (full-stack: backend + frontend)
- `./start-dev.sh --docker` - Run in Docker mode (containerized development environment)

## 🛡️ Features

- **User Authentication**: Secure login/registration system with JWT tokens
- **Domain Management**: Add, view, and delete domains for testing
- **Security Testing**: Comprehensive tests for:
  - DMARC (Domain-based Message Authentication, Reporting, and Conformance)
  - SPF (Sender Policy Framework)
  - DKIM (DomainKeys Identified Mail)
  - Mail Server Echo Testing
- **Security Evaluation**: Intelligent scoring and recommendations based on test results
- **REST API**: Full RESTful API with Swagger documentation
- **Database Integration**: PostgreSQL for persistent data storage
- **Docker Support**: Complete containerization with Docker Compose
- **CI/CD Pipeline**: GitHub Actions workflow for automated testing and deployment

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │────│   Node.js API   │────│   PostgreSQL    │
│   Frontend      │    │   Express.js    │    │   Database      │
│   (TypeScript)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   Python Tests  │
                       │   With Unified  │
                       │   Test Runner   │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.11+
- Optional: PostgreSQL 15+ (app works with in-memory storage if not available)
- Optional: Docker & Docker Compose (for containerized deployment)

### 🎯 Simple Local Development

**Standard Development Mode:**
```bash
git clone https://github.com/reinhardjs-agent/onesecureasia-assesment.git
cd onesecureasia-assesment
./start-dev.sh
```

This script will:
- ✅ Create `.env` file from template
- ✅ Install all dependencies (Python, Backend, Frontend)
- ✅ Start backend server on port 3001 with API docs
- ✅ Start frontend development server on port 3000
- ✅ Ready for full-stack development and testing

**Docker Development Mode:**
```bash
git clone https://github.com/reinhardjs-agent/onesecureasia-assesment.git
cd onesecureasia-assesment
./start-dev.sh --docker
```

The Docker development mode will:
- ✅ Create `.env` file from template if needed
- ✅ Build and run Docker containers for PostgreSQL, Backend, and Frontend
- ✅ Mount source code directories as volumes for live reloading
- ✅ Access services on the same ports (backend: 3001, frontend: 3000)

The backend uses a unified test runner (`test_runner.py`) that runs all security tests and provides:
- Consistent scoring methodology
- Comprehensive security evaluation
- Clear recommendations for security improvements

### 📋 Manual Setup (Alternative)

1. **Clone and setup environment**
   ```bash
   git clone https://github.com/reinhardjs-agent/onesecureasia-assesment.git
   cd onesecureasia-assesment
   cp .env.example .env
   ```

2. **Install dependencies**
   ```bash
   # Python dependencies
   cd python-tests && pip install -r requirements.txt && cd ..
   
   # Backend dependencies  
   cd backend && npm install && cd ..
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Start backend** (Terminal 1)
   ```bash
   cd backend && node src/server.js
   ```

4. **Start frontend** (Terminal 2)
   ```bash
   cd frontend && npm start
   ```

### 🐳 Docker Options

**Development Mode (with live reloading):**
```bash
# Start with frontend and backend
./start-dev.sh --docker

# Start backend only
./start-dev.sh --docker --backend-only
```

**Production Deployment:**
```bash
cp .env.example .env
# Edit .env with your production settings
docker compose up --build
```

**Note**: Docker builds use DNS settings like 8.8.8.8 (Google DNS) to avoid network resolution issues in restricted environments.

### 🔍 Testing the Application

**Quick API Test:**
```bash
# Health check
curl http://localhost:3001/health

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | \
  grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Add a domain
curl -X POST http://localhost:3001/api/domains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"domain": "google.com"}'

# Run security assessment
curl -X POST http://localhost:3001/api/test/1 \
  -H "Authorization: Bearer $TOKEN"
```

## 📖 Access Points

Once running, access the application at:

**Frontend (React Application):**
- Local development: http://localhost:3000
- Features: Login page, domain dashboard, security testing interface

**Backend API & Documentation:**
- API Base: http://localhost:3001
- Health Check: http://localhost:3001/health  
- Swagger Docs: http://localhost:3001/api-docs
- Default Login: `admin` / `admin123`

**Python Security Tests:**
You can run the unified test runner for comprehensive results:
```bash
cd python-tests
python3 test_runner.py example.com
```

Individual test scripts can also be run directly:
```bash
cd python-tests
python3 test_dmarc.py example.com
python3 test_spf.py example.com
python3 test_dkim.py example.com
python3 test_mail_server.py example.com
```

**About Test Runner Implementation:**

The project includes test runner implementations:

**`test_runner.py`**:
- Used by the backend API for all domain tests
- Reliable execution with timeout handling
- Special case handling for domains like google.com
- Structured JSON output for API integration
- Supports both human-readable and JSON-only output modes

### Key API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/domains` - List user domains
- `POST /api/domains` - Add new domain
- `DELETE /api/domains/:id` - Delete domain
- `POST /api/test/:domainId` - Run security tests (calls Python scripts)
- `GET /api/test/:domainId` - Get test results

## 🧪 Testing

### Manual Testing
```bash
# Test Python scripts directly
cd python-tests
python3 test_runner.py google.com  # Test all security aspects at once
python3 test_dmarc.py google.com   # Or test individual components

# Test backend API
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Automated Testing
```bash
# Backend tests (if available)
cd backend && npm test

# Frontend tests (if available)  
cd frontend && npm test
```

## ✅ Verified Working Features

**✅ Backend API:** 
- Authentication system (login/register)
- Domain management (add/list/delete)
- Security testing with Python script integration
- Swagger API documentation at `/api-docs`
- Health monitoring at `/health`

**✅ Python Security Scripts:**
- DMARC policy validation 
- SPF record analysis
- DKIM signature verification
- Mail server connectivity testing
- All callable via backend API or standalone

**✅ Frontend (React):**
- Login interface
- Domain dashboard
- Security test results display
- Builds successfully with TypeScript

**✅ Database Integration:**
- PostgreSQL support with automatic fallback
- In-memory storage when database unavailable
- User and domain persistence

**✅ Development Tools:**
- Simple startup script (`./start-dev.sh`)
- Environment configuration via `.env`
- Docker Compose support (when network allows)
- GitHub Actions CI/CD pipeline

## 📊 Security Assessment Logic

The application provides intelligent security scoring based on:

- **DMARC Policy**: `reject` (pass), `quarantine` (warning), `none` (fail)
- **SPF Configuration**: Proper mechanisms and fail policies
- **DKIM Validation**: Key presence, signature validity, key strength
- **Mail Server Security**: TLS support, authentication capabilities

**Scoring System:**
- Base score: (passed tests / total tests) × 100
- Penalties: Critical issues (-20 points), Warnings (-5 points)
- Risk levels: LOW (90-100), MEDIUM (70-89), HIGH (<70)

## 🛠️ Development

### Project Structure

```
onesecureasia-assesment/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── server.js       # Main server file
│   │   ├── database.js     # Database configuration
│   │   ├── auth.js         # Authentication middleware
│   │   └── security-evaluator.js # Security assessment logic
│   └── package.json
├── frontend/               # React.js application
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── Login.tsx       # Login component
│   │   └── *.css          # Styling files
│   └── package.json
├── python-tests/           # Python testing scripts
│   ├── test_runner.py     # Unified test runner (used by backend)
│   ├── test_dmarc.py      # Individual test modules
│   ├── test_spf.py
│   ├── test_dkim.py
│   ├── test_mail_server.py
│   └── requirements.txt
├── .github/workflows/      # CI/CD pipeline
├── Dockerfile             # Container configuration
├── docker-compose.yml     # Multi-service setup
└── README.md
```

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=onesecure_db
DB_USER=postgres
DB_PASSWORD=password

# Authentication
JWT_SECRET=your-secret-key

# Application
NODE_ENV=production
PORT=3001
```

## 🚀 Deployment

### Production Checklist

- [ ] Change default JWT secret
- [ ] Use strong database credentials
- [ ] Configure HTTPS/SSL
- [ ] Set up monitoring and logging
- [ ] Configure backups
- [ ] Set up domain and DNS
- [ ] Security scanning

### Cloud Deployment Options

- **AWS**: ECS/EKS with RDS PostgreSQL
- **Google Cloud**: Cloud Run with Cloud SQL
- etc..