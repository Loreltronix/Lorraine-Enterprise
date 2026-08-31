const express = require('express');
const app = express();

let sql = null;
let dbStatus = 'Not initialized';

try {
    const { neon } = require('@neondatabase/serverless');
    const connectionString = process.env.DATABASE__UNPOOLED;
    
    if (connectionString) {
        sql = neon(connectionString);
        dbStatus = '✅ Database connected!';
        console.log('✅ Database connected');
    } else {
        dbStatus = '⚠️ DATABASE__UNPOOLED not set';
        console.log('⚠️ No connection string found');
    }
} catch (error) {
    dbStatus = '❌ Database error: ' + error.message;
    console.error('❌ Database error:', error.message);
}

app.get('/', async (req, res) => {
    try {
        // If database is not available, return a friendly message
        if (!sql) {
            return res.json({
                message: '✅ Lorraine Enterprise is alive!',
                status: 'Server is running',
                database: dbStatus,
                hint: 'Set DATABASE__UNPOOLED in Vercel environment variables'
            });
        }
        
        // Test the database connection
        const result = await sql`SELECT 'Connected to Neon!' as message;`;
        res.json({ 
            message: '✅ Lorraine Enterprise is live!',
            database: result[0].message,
            status: '✅ Database connected!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            message: '✅ Server is running',
            database: '❌ Query failed',
            error: error.message,
            status: 'Database error but server is alive'
        });
    }
});

module.exports = app;
