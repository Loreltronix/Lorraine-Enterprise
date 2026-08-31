const express = require('express');
const app = express();

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Lorraine Enterprise is live!',
        status: 'running',
        version: '1.0.0'
    });
});

// Handle favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Export for Vercel
module.exports = app;
