const jwt = require('jsonwebtoken');

function decodeToken(token) {
  try {
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    
    // Decode without verification for debugging
    const decoded = jwt.decode(tokenValue);
    console.log('Decoded token:', JSON.stringify(decoded, null, 2));
    
    if (decoded && decoded.user) {
      console.log('\nUser info:');
      console.log('  ID:', decoded.user.id);
      console.log('  Role:', decoded.user.role);
      console.log('  Email:', decoded.user.email);
    }
    
  } catch (error) {
    console.error('Error decoding token:', error.message);
  }
}

// Get token from command line argument
const token = process.argv[2];
if (!token) {
  console.error('Please provide a JWT token as an argument');
  process.exit(1);
}

decodeToken(token);
