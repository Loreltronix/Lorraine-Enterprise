const express = require('express');
const { neon } = require('@neondatabase/serverless');

const app = express();
app.use(express.json());

// Use the correct environment variable name
const connectionString = process.env.DATABASE__UNPOOLED;
console.log('🔑 Connection string found:', connectionString ? '✅ Yes' : '❌ No');

// Initialize database connection
const sql = neon(connectionString);

// Health check endpoint
app.get('/', async (req, res) => {
    try {
        const result = await sql`SELECT 'Lorraine Enterprise is live with Neon!' as message;`;
        res.json({ 
            message: result[0].message,
            status: '✅ Database connected!',
            database: 'lorraine-db',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            error: 'Database connection failed',
            details: error.message
        });
    }
});

// API endpoint to add a comment
app.post('/api/comments', async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment) {
            return res.status(400).json({ error: 'Comment is required' });
        }
        await sql`INSERT INTO comments (comment) VALUES (${comment});`;
        res.json({ message: 'Comment added successfully!', comment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get all comments
app.get('/api/comments', async (req, res) => {
    try {
        const comments = await sql`SELECT * FROM comments ORDER BY id DESC;`;
        res.json({ comments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Setup endpoint to create the comments table
app.get('/setup', async (req, res) => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        res.json({ message: '✅ Comments table created successfully in lorraine-db!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

module.exports = app;
