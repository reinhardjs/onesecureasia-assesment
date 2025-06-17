# OneSecure Asia - Domain Security Assessment Platform

A comprehensive full-stack application for testing domain security configurations including DMARC, SPF, DKIM, and mail server security assessments.

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
                       │   DMARC/SPF/    │
                       │   DKIM/Mail     │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.11+
- PostgreSQL 15+ (or use Docker Compose)
- Docker & Docker Compose (for containerized deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/reinhardjs-agent/onesecureasia-assesment.git
   cd onesecureasia-assesment
   ```

2. **Install Python dependencies**
   ```bash
   cd python-tests
   pip install -r requirements.txt
   cd ..
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. **Configure environment variables**
   
   Copy the example environment file and configure your settings:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials and JWT secret:
   ```bash
   # Example .env content
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=onesecure_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   PORT=3001
   ```

6. **Start the development environment**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm install  # Install dependencies including dotenv
   npm run dev
   
   # Terminal 2: Start frontend (in development mode)
   cd frontend
   npm start
   ```

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   
   First, configure your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   ```
   
   Then start the services:
   ```bash
   docker-compose up --build
   ```
   
   This will start:
   - PostgreSQL database on port 5432
   - Application on port 3001
   - Nginx reverse proxy on port 80

2. **Using Docker only**
   ```bash
   docker build -t onesecure-app .
   docker run -p 3001:3001 onesecure-app
   ```

## 📖 API Documentation

Once the application is running, access the Swagger API documentation at:
- Local: http://localhost:3001/api-docs
- Docker: http://localhost/api-docs

### Authentication

The API uses JWT Bearer tokens for authentication. 

**Default credentials:**
- Username: `admin`
- Password: `admin123`

### Key Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/domains` - List user domains
- `POST /api/domains` - Add new domain
- `DELETE /api/domains/:id` - Delete domain
- `POST /api/test/:domainId` - Run security tests
- `GET /api/test/:domainId` - Get test results

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Python Script Tests
```bash
cd python-tests
python3 test_dmarc.py example.com
python3 test_spf.py example.com
python3 test_dkim.py example.com
python3 test_mail_server.py example.com
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection protection with parameterized queries
- CORS configuration
- Security headers via Nginx
- Container security with non-root user

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
│   ├── test_dmarc.py
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