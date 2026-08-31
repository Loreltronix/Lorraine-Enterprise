const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

console.log('🚀 SERVER STARTING...');

app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API is working!', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
    res.json([
        { id: 1, name: 'Premium Laptop', price: 45000, category: 'laptops', available: true, stock_quantity: 10 },
        { id: 2, name: 'Gaming Desktop', price: 85000, category: 'desktops', available: true, stock_quantity: 5 },
        { id: 3, name: 'Wireless Headset', price: 3500, category: 'accessories', available: true, stock_quantity: 20 },
        { id: 4, name: '4K Monitor', price: 28000, category: 'monitors', available: true, stock_quantity: 8 },
        { id: 5, name: 'Mechanical Keyboard', price: 4500, category: 'accessories', available: true, stock_quantity: 15 },
        { id: 6, name: 'Gaming Mouse', price: 2500, category: 'accessories', available: true, stock_quantity: 25 }
    ]);
});

app.get('/api/services', (req, res) => {
    res.json([
        { id: 101, name: 'Digital Marketing', price: 'Custom Quote', category: 'marketing', available: true },
        { id: 102, name: 'Branding Services', price: 'Custom Quote', category: 'branding', available: true },
        { id: 103, name: 'Web Development', price: 'Custom Quote', category: 'solutions', available: true }
    ]);
});

app.post('/api/auth/login', (req, res) => {
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

app.post('/api/auth/register', (req, res) => {
    const { email, password, full_name } = req.body;
    res.json({
        token: 'fake-token-' + Date.now(),
        user: { id: 2, email, full_name: full_name || 'Customer', role: 'customer' }
    });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ id: 1, email: 'admin@lorraine.com', full_name: 'Admin', role: 'admin' });
});

app.put('/api/auth/me', (req, res) => {
    res.json({ success: true, message: 'Profile updated' });
});

app.put('/api/auth/password', (req, res) => {
    res.json({ success: true, message: 'Password changed' });
});

app.get('/api/orders', (req, res) => {
    res.json([]);
});

app.post('/api/orders', (req, res) => {
    res.json({ order_number: 'ORD-' + Date.now(), status: 'Pending' });
});

app.get('/api/admin/dashboard', (req, res) => {
    res.json({
        total_products: 6,
        products_in_stock: 6,
        low_stock_products: 0,
        total_orders: 0,
        visitors_today: 42,
        total_revenue: 0,
        recent_orders: []
    });
});

app.get('/api/admin/orders', (req, res) => {
    res.json([]);
});

app.get('/api/admin/products', (req, res) => {
    res.json([]);
});

app.get('/api/admin/users', (req, res) => {
    res.json([]);
});

app.get('/api/admin/enquiries', (req, res) => {
    res.json([]);
});

app.post('/api/service-enquiries', (req, res) => {
    res.json({ success: true, message: 'Enquiry sent' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('📧 Email: admin@lorraine.com');
        console.log('🔑 Password: Admin@2026');
    });
}
