const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_4LOVwZXC3Gud@ep-shy-poetry-awl0bqk3-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const sql = neon(connectionString);

async function createTable() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_email TEXT,
                customer_phone TEXT NOT NULL,
                delivery_address TEXT,
                delivery_city TEXT,
                delivery_notes TEXT,
                items JSONB,
                subtotal DECIMAL(10,2),
                delivery_fee DECIMAL(10,2),
                total DECIMAL(10,2),
                status TEXT DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;
        console.log('✅ Orders table created successfully!');
    } catch (error) {
        console.error('❌ Error creating table:', error.message);
    }
}

createTable();
