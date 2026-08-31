const express = require('express');
const app = express();

let sql = null;
let dbStatus = 'Not initialized';

try {
    const { neon } = require('@neondatabase/serverless');
    
    // Try multiple possible environment variable names
    const connectionString = process.env.DATABASE__UNPOOLED || 
                            process.env.DATABASE_URL || 
                            process.env.POSTGRES_URL;
    
    console.log('🔑 Connection string:', connectionString ? '✅ Found' : '❌ Not found');
    
    if (connectionString) {
        sql = neon(connectionString);
        dbStatus = '✅ Database connected!';
        console.log('✅ Database connected');
    } else {
        dbStatus = '⚠️ DATABASE__UNPOOLED not set';
        console.log('⚠️ No connection string found');
        console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('POSTGRES')));
    }
} catch (error) {
    dbStatus = '❌ Database error: ' + error.message;
    console.error('❌ Database error:', error.message);
}

app.get('/', async (req, res) => {
    try {
        if (!sql) {
            return res.json({
                message: '✅ Lorraine Enterprise is alive!',
                status: 'Server is running',
                database: dbStatus,
                hint: 'Set DATABASE__UNPOOLED in Vercel environment variables'
            });
        }
        
        const result = await sql`SELECT 'Connected to Neon!' as message;`;
        res.json({ 
            message: '✅ Lorraine Enterprise is live!',
            database: result[0].message,
            status: '✅ Database connected!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Query error:', error);
        res.json({
            message: '✅ Server is running',
            database: '❌ Query failed',
            error: error.message,
            status: 'Database error but server is alive'
        });
    }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

module.exports = app;
