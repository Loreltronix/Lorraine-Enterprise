const express = require('express');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let sql = null;
try {
    const connectionString = process.env.DATABASE__UNPOOLED;
    if (connectionString) {
        sql = neon(connectionString);
        console.log('✅ Database connected');
    }
} catch (error) {
    console.error('Database error:', error.message);
}

// Serve your FULL HTML file (not index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

// API endpoints
app.get('/api/status', async (req, res) => {
    try {
        if (!sql) {
            return res.json({ status: 'Database not connected' });
        }
        const result = await sql`SELECT 'Connected to Neon!' as message;`;
        res.json({ 
            status: '✅ Database connected!',
            message: result[0].message
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.get('/api/comments', async (req, res) => {
    try {
        const comments = await sql`SELECT * FROM comments ORDER BY id DESC;`;
        res.json({ comments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/setup', async (req, res) => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                comment TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        res.json({ message: '✅ Table created successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Handle other routes (for SPA or additional pages)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

module.exports = app;
