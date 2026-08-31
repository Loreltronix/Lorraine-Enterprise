const express = require('express');
const app = express();

// Debug: Check environment variables
const debug = {
    hasDatabaseUnpooled: !!process.env.DATABASE__UNPOOLED,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'not set'
};

// Try loading the database driver
let sql = null;
let loadError = null;
let driverLoaded = false;

try {
    console.log('Attempting to load @neondatabase/serverless...');
    const { neon } = require('@neondatabase/serverless');
    driverLoaded = true;
    console.log('✅ Driver loaded');
    
    const connectionString = process.env.DATABASE__UNPOOLED;
    if (connectionString) {
        sql = neon(connectionString);
        console.log('✅ Database initialized');
    } else {
        loadError = 'DATABASE__UNPOOLED environment variable is not set';
        console.error('❌', loadError);
    }
} catch (error) {
    loadError = error.message;
    console.error('❌ Driver load error:', error.message);
}

app.get('/', async (req, res) => {
    try {
        // Return debug info if there's an error
        if (loadError) {
            return res.status(500).json({
                error: 'Database initialization failed',
                details: loadError,
                debug: debug,
                driverLoaded: driverLoaded,
                hasSql: !!sql
            });
        }
        
        if (!sql) {
            return res.status(500).json({
                error: 'SQL client not initialized',
                debug: debug
            });
        }
        
        // Test the connection
        const result = await sql`SELECT 'Connected!' as message;`;
        res.json({
            message: '✅ Lorraine Enterprise is live!',
            database: result[0].message,
            debug: debug
        });
    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({
            error: 'Database query failed',
            details: error.message,
            stack: error.stack,
            debug: debug
        });
    }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

module.exports = app;
