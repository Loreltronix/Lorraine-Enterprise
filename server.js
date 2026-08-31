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

// ============================================================
// PRODUCTS / ITEMS ENDPOINTS
// ============================================================

// Get all items
app.get('/api/items', async (req, res) => {
    try {
        // For testing - return sample products
        const items = [
            { id: 1, name: 'Premium Laptop', price: 45000, category: 'Laptops', image: '/images/laptop.jpg' },
            { id: 2, name: 'Gaming Desktop', price: 85000, category: 'Desktops', image: '/images/desktop.jpg' },
            { id: 3, name: 'Wireless Headset', price: 3500, category: 'Accessories', image: '/images/headset.jpg' },
            { id: 4, name: '4K Monitor', price: 28000, category: 'Monitors', image: '/images/monitor.jpg' },
            { id: 5, name: 'Mechanical Keyboard', price: 4500, category: 'Accessories', image: '/images/keyboard.jpg' },
            { id: 6, name: 'Gaming Mouse', price: 2500, category: 'Accessories', image: '/images/mouse.jpg' }
        ];
        
        res.json(items);
    } catch (error) {
        console.error('Items error:', error);
        res.status(500).json({ error: 'Failed to load items' });
    }
});

// Get single item by ID
app.get('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Sample items
        const items = [
            { id: 1, name: 'Premium Laptop', price: 45000, category: 'Laptops', image: '/images/laptop.jpg', description: 'High-performance laptop for business and gaming' },
            { id: 2, name: 'Gaming Desktop', price: 85000, category: 'Desktops', image: '/images/desktop.jpg', description: 'Powerful desktop for gaming and content creation' }
        ];
        
        const item = items.find(i => i.id === parseInt(id));
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ error: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load item' });
    }
});

// Cart endpoints
app.post('/api/cart', async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        // For testing - just return success
        res.json({ 
            success: true, 
            message: 'Item added to cart!',
            cart: [{ id: itemId, quantity: quantity }]
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

app.get('/api/cart', async (req, res) => {
    try {
        // For testing - return empty cart
        res.json({ items: [], total: 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load cart' });
    }
});

// Orders endpoint
app.post('/api/orders', async (req, res) => {
    try {
        const { items, total, shippingInfo } = req.body;
        res.json({
            success: true,
            message: 'Order placed successfully!',
            orderId: 'ORD-' + Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// ============================================================
// PRODUCTS / ITEMS ENDPOINTS
// ============================================================

// Get all products
app.get('/api/items', async (req, res) => {
    console.log('📦 Fetching items...');
    
    try {
        // Sample products - you can replace these with database products
        const items = [
            {
                id: 1,
                name: "Premium Laptop",
                price: 45000,
                category: "Laptops",
                image: "https://placehold.co/300x200/1a237e/white?text=Laptop",
                description: "High-performance laptop for business and gaming"
            },
            {
                id: 2,
                name: "Gaming Desktop",
                price: 85000,
                category: "Desktops",
                image: "https://placehold.co/300x200/1a237e/white?text=Desktop",
                description: "Powerful desktop for gaming and content creation"
            },
            {
                id: 3,
                name: "Wireless Headset",
                price: 3500,
                category: "Accessories",
                image: "https://placehold.co/300x200/1a237e/white?text=Headset",
                description: "Premium wireless headset with noise cancellation"
            },
            {
                id: 4,
                name: "4K Monitor",
                price: 28000,
                category: "Monitors",
                image: "https://placehold.co/300x200/1a237e/white?text=Monitor",
                description: "Ultra HD 4K monitor for professional work"
            },
            {
                id: 5,
                name: "Mechanical Keyboard",
                price: 4500,
                category: "Accessories",
                image: "https://placehold.co/300x200/1a237e/white?text=Keyboard",
                description: "RGB mechanical keyboard with blue switches"
            },
            {
                id: 6,
                name: "Gaming Mouse",
                price: 2500,
                category: "Accessories",
                image: "https://placehold.co/300x200/1a237e/white?text=Mouse",
                description: "High-precision gaming mouse with RGB lighting"
            }
        ];
        
        console.log(`✅ Returning ${items.length} items`);
        res.json(items);
    } catch (error) {
        console.error('❌ Items error:', error);
        res.status(500).json({ error: 'Failed to load items' });
    }
});

// Get single item by ID
app.get('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const items = [
            { id: 1, name: 'Premium Laptop', price: 45000, category: 'Laptops', image: 'https://placehold.co/300x200/1a237e/white?text=Laptop' },
            { id: 2, name: 'Gaming Desktop', price: 85000, category: 'Desktops', image: 'https://placehold.co/300x200/1a237e/white?text=Desktop' },
            { id: 3, name: 'Wireless Headset', price: 3500, category: 'Accessories', image: 'https://placehold.co/300x200/1a237e/white?text=Headset' }
        ];
        
        const item = items.find(i => i.id === parseInt(id));
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ error: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load item' });
    }
});

// ============================================================
// CART ENDPOINTS
// ============================================================

// Add to cart
app.post('/api/cart', async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        console.log('🛒 Adding to cart:', itemId, quantity);
        
        res.json({ 
            success: true, 
            message: 'Item added to cart!',
            item: { id: itemId, quantity: quantity }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// Get cart
app.get('/api/cart', async (req, res) => {
    try {
        res.json({ items: [], total: 0 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load cart' });
    }
});

// ============================================================
// ORDERS ENDPOINTS
// ============================================================

// Place order
app.post('/api/orders', async (req, res) => {
    try {
        const { items, total, shippingInfo } = req.body;
        console.log('📦 New order:', { items, total });
        
        res.json({
            success: true,
            message: 'Order placed successfully!',
            orderId: 'ORD-' + Date.now(),
            total: total
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Get orders
app.get('/api/orders', async (req, res) => {
    try {
        res.json({ orders: [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

// ============================================================
// CONTACT ENDPOINTS
// ============================================================

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        console.log('📧 Contact form:', { name, email, message });
        
        res.json({
            success: true,
            message: 'Message sent successfully!'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

console.log('✅ All API endpoints registered');

// ============================================================
// TEST ENDPOINT
// ============================================================

app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ API is working!', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});
