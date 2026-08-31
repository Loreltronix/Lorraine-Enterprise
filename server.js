const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

console.log('🚀 SERVER STARTING...');

// ============================================================
// API ROUTES
// ============================================================

app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API is working!', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
    console.log('📦 Products API called');
    res.json([
        { id: 1, name: 'Premium Laptop', price: 45000, category: 'laptops', available: true, stock_quantity: 10, short_description: 'High-performance laptop' },
        { id: 2, name: 'Gaming Desktop', price: 85000, category: 'desktops', available: true, stock_quantity: 5, short_description: 'Powerful gaming PC' },
        { id: 3, name: 'Wireless Headset', price: 3500, category: 'accessories', available: true, stock_quantity: 20, short_description: 'Noise-cancelling headset' },
        { id: 4, name: '4K Monitor', price: 28000, category: 'monitors', available: true, stock_quantity: 8, short_description: 'Ultra HD display' },
        { id: 5, name: 'Mechanical Keyboard', price: 4500, category: 'accessories', available: true, stock_quantity: 15, short_description: 'RGB mechanical keyboard' },
        { id: 6, name: 'Gaming Mouse', price: 2500, category: 'accessories', available: true, stock_quantity: 25, short_description: 'High-precision gaming mouse' }
    ]);
});

app.get('/api/services', (req, res) => {
    console.log('📋 Services API called');
    res.json([
        { id: 101, name: 'Digital Marketing', price: 'Custom Quote', category: 'marketing', available: true, short_description: 'Grow your online presence' },
        { id: 102, name: 'Branding Services', price: 'Custom Quote', category: 'branding', available: true, short_description: 'Build your brand identity' },
        { id: 103, name: 'Web Development', price: 'Custom Quote', category: 'solutions', available: true, short_description: 'Custom websites and apps' }
    ]);
});

app.post('/api/auth/login', (req, res) => {
    console.log('🔐 Login attempt:', req.body.email);
    const { email, password } = req.body;
    
    if (email === 'admin@lorraine.com' && password === 'Admin@2026') {
        res.json({
            token: 'fake-token-' + Date.now(),
            user: { id: 1, email, full_name: 'Admin', role: 'admin' }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// ============================================================
// HTML ROUTES
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

module.exports = app;

// ============================================================
// LOCAL SERVER
// ============================================================
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('📧 Email: admin@lorraine.com');
        console.log('🔑 Password: Admin@2026');
        console.log('📦 API: http://localhost:' + PORT + '/api/products');
    });
}
