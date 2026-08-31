const express = require('express');
const path = require('path');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

console.log('🚀 SERVER STARTING...');

// Database connection
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

// ============================================================
// SERVE HTML
// ============================================================

app.get('/', (req, res) => {
    console.log('📄 Serving HTML file');
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

// ============================================================
// API ENDPOINTS
// ============================================================

// Status endpoint
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

// Comments endpoints
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

// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt:', email);
        
        // For testing - hardcoded credentials
        if (email === 'admin@lorraine.com' && password === 'Admin@2026') {
            res.json({
                success: true,
                message: 'Login successful!',
                user: {
                    id: 1,
                    email: email,
                    name: 'Admin',
                    role: 'admin'
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log('📝 Registration attempt:', email);
        
        res.json({
            success: true,
            message: 'Registration successful!',
            user: {
                id: Date.now(),
                name: name,
                email: email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

app.get('/api/me', (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: 1,
            name: 'Admin',
            email: 'admin@lorraine.com',
            role: 'admin'
        }
    });
});

app.post('/api/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Setup endpoint
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

// Catch-all route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

module.exports = app;
