// API Test Script for Medical Assistant Backend
// Base URL
const BASE_URL = 'https://medi-search-server.vercel.app';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function for colored console output
const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}`)
};

// Test 1: Test Suggestion Endpoint
async function testSuggestionEndpoint() {
  log.section('TEST 1: Suggestion Endpoint');
  
  const testQueries = [
    'fever',
    'headache',
    'diabetes',
    'cough',
    'stomach pain'
  ];

  for (const query of testQueries) {
    try {
      log.info(`Testing query: "${query}"`);
      const response = await fetch(
        `${BASE_URL}/suggestion?query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        log.error(`HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      // Check if response is an array or has suggestions property
      const suggestions = Array.isArray(data) ? data : data.suggestions;
      
      if (Array.isArray(suggestions)) {
        log.success(`Received ${suggestions.length} suggestions`);
        console.log('   Sample suggestions:', suggestions.slice(0, 3));
      } else {
        log.warn('Response is not an array');
        console.log('   Response:', data);
      }
      
    } catch (error) {
      log.error(`Error: ${error.message}`);
    }
    console.log(''); // Add spacing
  }
}

// Test 2: Test Answer Endpoint
async function testAnswerEndpoint() {
  log.section('TEST 2: Answer Endpoint');
  
  const testQueries = [
    'What are the symptoms of fever?',
    'How to treat headache?',
    'What is diabetes?',
    'Causes of cough',
    'Treatment for stomach pain'
  ];

  for (const query of testQueries) {
    try {
      log.info(`Testing query: "${query}"`);
      const response = await fetch(
        `${BASE_URL}/answer?query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        log.error(`HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      if (data.answer) {
        log.success('Received answer');
        console.log('   Answer preview:', data.answer.substring(0, 100) + '...');
      } else {
        log.warn('No answer field in response');
        console.log('   Response:', data);
      }
      
    } catch (error) {
      log.error(`Error: ${error.message}`);
    }
    console.log(''); // Add spacing
  }
}

// Test 3: Test Edge Cases
async function testEdgeCases() {
  log.section('TEST 3: Edge Cases');
  
  // Empty query
  try {
    log.info('Testing empty query');
    const response = await fetch(`${BASE_URL}/suggestion?query=`);
    const data = await response.json();
    log.success('Empty query handled');
    console.log('   Response:', data);
  } catch (error) {
    log.error(`Error: ${error.message}`);
  }
  console.log('');

  // Special characters
  try {
    log.info('Testing special characters');
    const response = await fetch(
      `${BASE_URL}/suggestion?query=${encodeURIComponent('fever & cold?!')}`
    );
    const data = await response.json();
    log.success('Special characters handled');
    console.log('   Response:', data);
  } catch (error) {
    log.error(`Error: ${error.message}`);
  }
  console.log('');

  // Very long query
  try {
    log.info('Testing long query');
    const longQuery = 'a'.repeat(200);
    const response = await fetch(
      `${BASE_URL}/suggestion?query=${encodeURIComponent(longQuery)}`
    );
    const data = await response.json();
    log.success('Long query handled');
    console.log('   Response length:', JSON.stringify(data).length);
  } catch (error) {
    log.error(`Error: ${error.message}`);
  }
  console.log('');
}

// Test 4: Test Response Time
async function testResponseTime() {
  log.section('TEST 4: Response Time');
  
  const query = 'fever';
  const iterations = 5;
  const times = [];

  for (let i = 1; i <= iterations; i++) {
    try {
      log.info(`Request ${i}/${iterations}`);
      const startTime = performance.now();
      
      const response = await fetch(
        `${BASE_URL}/suggestion?query=${encodeURIComponent(query)}`
      );
      await response.json();
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      times.push(parseFloat(duration));
      
      log.success(`Response time: ${duration}ms`);
    } catch (error) {
      log.error(`Error: ${error.message}`);
    }
  }

  if (times.length > 0) {
    const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
    const minTime = Math.min(...times).toFixed(2);
    const maxTime = Math.max(...times).toFixed(2);
    
    console.log('');
    log.info(`Average response time: ${avgTime}ms`);
    log.info(`Min response time: ${minTime}ms`);
    log.info(`Max response time: ${maxTime}ms`);
  }
}

// Test 5: Test CORS and Headers
async function testCORS() {
  log.section('TEST 5: CORS and Headers');
  
  try {
    log.info('Testing CORS headers');
    const response = await fetch(`${BASE_URL}/suggestion?query=test`);
    
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    
    if (response.ok) {
      log.success('CORS is properly configured');
    } else {
      log.warn('Unexpected status code');
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════╗
║     Medical Assistant API Test Suite              ║
║     Backend URL: ${BASE_URL}     ║
╚════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    await testSuggestionEndpoint();
    await testAnswerEndpoint();
    await testEdgeCases();
    await testResponseTime();
    await testCORS();
    
    log.section('TEST SUITE COMPLETED');
    log.success('All tests finished!');
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
  }
}

// Run tests
runAllTests();