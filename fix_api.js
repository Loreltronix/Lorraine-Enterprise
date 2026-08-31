// Find the API_URL definition and replace it
const fs = require('fs');
const html = fs.readFileSync('lorraineenterprise.html', 'utf8');

// Replace the API_URL definition with a smarter one
const fixed = html.replace(
    /const API_URL = ["'].*["'];/,
    `const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000' 
        : '';`
);

fs.writeFileSync('lorraineenterprise.html', fixed);
console.log('✅ API_URL fixed!');
