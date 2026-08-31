const express = require('express');
const app = express();

// Try loading the database driver
let sql = null;
let initError = null;

try {
    console.log('🔄 Loading Neon driver...');
    const { neon } = require('@neondatabase/serverless');
    
    // Try different environment variable names
    const connectionString = process.env.DATABASE_URL || 
                            process.env.POSTGRES_URL || 
                            process.env.DATABASE__UNPOOLED;
    
    console.log('🔑 Connection string found:', connectionString ? '✅ Yes' : '❌ No');
    
    if (!connectionString) {
        initError = new Error('No DATABASE_URL found in environment variables');
    } else {
        sql = neon(connectionString);
        console.log('✅ Database driver initialized');
    }
} catch (error) {
    initError = error;
    console.error('❌ Driver error:', error.message);
}

app.get('/', async (req, res) => {
    try {
        // Check for initialization errors
        if (initError) {
            return res.status(500).json({
                error: 'Database initialization failed',
                details: initError.message,
                hint: 'Make sure DATABASE_URL is set in Vercel environment variables'
            });
        }
        
        if (!sql) {
            return res.status(500).json({
                error: 'Database not initialized',
                details: 'SQL client is null'
            });
        }
        
        // Test the connection
        const result = await sql`SELECT 'Connected to Neon!' as message;`;
        res.json({
            message: '✅ Lorraine Enterprise is live!',
            database: result[0].message,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({
            error: 'Database query failed',
            details: error.message,
            code: error.code
        });
    }
});

// Setup endpoint to create tables
app.get('/setup', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not initialized' });
        }
        
        await sql`
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        res.json({ 
            message: '✅ Tables created successfully!',
            database: 'lorraine-db'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

module.exports = app;
