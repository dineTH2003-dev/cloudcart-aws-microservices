-- ShopSphere Database Initialization Script
-- Creates tables and seeds tech gadget catalog data

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

-- Seed ShopSphere Tech Products (12 items across 6 categories)
INSERT INTO products (id, name, description, price_cents, stock_quantity, category, image_url)
VALUES
    -- Laptops
    ('prod-101', 'MacBook Pro 14" M3 Pro', 'Apple MacBook Pro 14-inch with M3 Pro chip, 18GB RAM, 512GB SSD. Supercharged by the M3 Pro chip for demanding pro workflows.', 199900, 15, 'Laptops', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=400&q=80'),
    ('prod-102', 'Dell XPS 15 OLED', 'Dell XPS 15 with Intel Core i9, NVIDIA RTX 4070, 32GB RAM, 1TB SSD and a stunning 3.5K OLED touch display.', 249900, 8, 'Laptops', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=400&q=80'),

    -- Audio
    ('prod-201', 'Sony WH-1000XM5 Headphones', 'Industry-leading noise cancelling wireless headphones with up to 30-hour battery life, quick charge, and crystal-clear voice calls.', 34999, 42, 'Audio', 'https://images.unsplash.com/photo-1546435770-a3e736bf1c87?auto=format&fit=crop&w=400&q=80'),
    ('prod-202', 'Apple AirPods Pro (2nd Gen)', 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio, and MagSafe Charging Case with USB-C.', 24900, 60, 'Audio', 'https://images.unsplash.com/photo-1606741965509-717c6eaf0fcf?auto=format&fit=crop&w=400&q=80'),

    -- Monitors
    ('prod-301', 'LG 27" 4K UHD Monitor', 'LG 27UK850-W IPS panel with 4K UHD resolution, USB-C, HDR10, and sRGB 99% color accuracy for professionals.', 59900, 20, 'Monitors', 'https://images.unsplash.com/photo-1593640408182-31c228813bcc?auto=format&fit=crop&w=400&q=80'),
    ('prod-302', 'Samsung 34" Ultrawide Curved', 'Samsung 34-inch curved ultrawide (3440x1440) QLED display with 165Hz refresh rate and 1ms response time for immersive gaming and work.', 79900, 12, 'Monitors', 'https://images.unsplash.com/photo-1527443060795-0402a18106b2?auto=format&fit=crop&w=400&q=80'),

    -- Keyboards
    ('prod-401', 'Keychron K2 Pro Mechanical', 'Compact 75% wireless mechanical keyboard with hot-swappable switches, RGB backlight, and Mac/Windows compatibility.', 11999, 55, 'Keyboards', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80'),
    ('prod-402', 'Apple Magic Keyboard with Touch ID', 'Wireless Magic Keyboard with numeric keypad and Touch ID. Perfect for Mac users wanting seamless authentication.', 17900, 35, 'Keyboards', 'https://images.unsplash.com/photo-1587829742040-ee5c8e42dc66?auto=format&fit=crop&w=400&q=80'),

    -- Smart Devices
    ('prod-501', 'Apple Watch Series 9 (45mm)', 'Advanced health features including blood oxygen, ECG, crash detection, and carbon neutral with new Double Tap gesture.', 42900, 25, 'Smart Devices', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80'),
    ('prod-502', 'Amazon Echo Show 10 (3rd Gen)', 'Smart display with 10.1" screen that moves to face you, built-in Zigbee smart home hub, and 13MP camera.', 24999, 30, 'Smart Devices', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80'),

    -- Accessories
    ('prod-601', 'Anker 100W GaN Charger', 'Anker 737 GaN 3-port charger delivering 100W total power — charge a MacBook Pro, iPad, and iPhone simultaneously.', 5999, 80, 'Accessories', 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?auto=format&fit=crop&w=400&q=80'),
    ('prod-602', 'Logitech MX Master 3S Mouse', 'Advanced wireless mouse with 8K DPI Darkfield sensor, MagSpeed scroll wheel, and silent clicks on any surface.', 9999, 48, 'Accessories', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    stock_quantity = EXCLUDED.stock_quantity,
    category = EXCLUDED.category,
    image_url = EXCLUDED.image_url;

-- Remove legacy demo products if any
DELETE FROM products WHERE id IN ('prod-103', 'prod-104', 'prod-105');
