const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ 
        message: '✅ Lorraine Enterprise is alive!',
        status: 'Vercel is working!',
        timestamp: new Date().toISOString()
    });
});

app.get('/test', (req, res) => {
    res.send('Test endpoint is working!');
});

module.exports = app;
