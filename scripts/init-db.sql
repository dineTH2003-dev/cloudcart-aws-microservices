-- CloudCart Database Initialization Script
-- Creates tables and seeds initial catalog data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Products
INSERT INTO products (id, name, description, price_cents, stock_quantity, category, image_url)
VALUES 
    ('prod-101', 'Cloud Practitioner Laptop Sleeve', 'Padded waterproof 14-inch sleeve with AWS logo accent.', 2999, 50, 'Accessories', 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'),
    ('prod-102', 'DevOps Mechanical Keyboard', 'Compact mechanical keyboard with brown switches and RGB backlighting.', 8999, 30, 'Electronics', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80'),
    ('prod-103', 'Solutions Architect Insulated Tumbler', 'Stainless steel 20oz double-wall insulated coffee tumbler.', 2499, 100, 'Apparel', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80'),
    ('prod-104', 'Kubernetes Cluster Cap', 'Embroidered breathable cotton dad cap with Kubernetes helm icon.', 1999, 45, 'Apparel', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80'),
    ('prod-105', 'High-Density Ergonomic Mousepad', 'Extended micro-weave cloth mousepad for engineering workstations.', 1850, 75, 'Accessories', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80')
ON CONFLICT (id) DO NOTHING;
