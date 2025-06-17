#!/bin/bash

# Test script for the backend API with test_runner.py integration
echo "Testing backend with test_runner.py integration"
echo "==============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed"
    exit 1
fi

# Change to the backend directory
cd "$(dirname "$0")/backend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Install Python dependencies if needed
cd ../python-tests
echo "Checking Python dependencies..."
python3 -m pip install -r requirements.txt

# Run test_runner.py directly to verify it works
echo "Testing test_runner.py directly..."
echo "=================================="
python3 test_runner.py google.com

# Go back to backend directory
cd ../backend

# Create a temporary test script
cat > test-api.js << EOL
// Test script to verify backend integration with test_runner.py

async function testAPI() {
  try {
    console.log('Testing domain google.com through API...');
    
    // Import the runSecurityTests function
    const { runSecurityTests } = require('./src/server.js');
    
    console.log('Running security tests for google.com...');
    const results = await runSecurityTests('google.com');
    
    console.log('Test results:');
    console.log(JSON.stringify(results, null, 2));
    
    // Check if we have results from test_runner.py
    if (results._test_runner_evaluation) {
      console.log('✅ Successfully got evaluation from test_runner.py');
      console.log('Score:', results._test_runner_evaluation.overall_score);
      console.log('Risk level:', results._test_runner_evaluation.risk_level);
      console.log('Recommendations:', 
        results._test_runner_evaluation.recommendations.length);
    } else {
      console.log('❌ Did not get evaluation from test_runner.py');
    }
    
    console.log('Tests completed');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testAPI();
EOL

# Run the test script
echo ""
echo "Running backend API test..."
echo "=========================="
node test-api.js

# Clean up
rm test-api.js

echo ""
echo "Test completed!"
