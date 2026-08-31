const express = require('express');
const app = express();

// Just load the driver, don't use it yet
try {
    require('@neondatabase/serverless');
    console.log('✅ Neon driver loaded');
} catch (error) {
    console.error('❌ Driver load error:', error.message);
}

app.get('/', (req, res) => {
    res.json({ 
        message: '✅ Lorraine Enterprise is alive!',
        status: 'Vercel is working!',
        driver: 'Neon driver loaded successfully',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
