import { useState, useEffect, useCallback } from 'react'

// ─── Service URL resolution ──────────────────────────────────────────────────
// In production (EKS + ALB), all calls go to same origin via ALB path routing.
// In local dev, Vite proxy forwards /api/* to localhost services.
const PRODUCT_URL  = window.PRODUCT_SERVICE_URL  || ''
const USER_URL     = window.USER_SERVICE_URL      || ''
const ORDER_URL    = window.ORDER_SERVICE_URL     || ''
const PAYMENT_URL  = window.PAYMENT_SERVICE_URL   || ''
const INVENTORY_URL= window.INVENTORY_SERVICE_URL || ''
const NOTIFY_URL   = window.NOTIFY_SERVICE_URL    || ''

const SERVICES = [
  { key: 'product',      label: 'Product',      url: PRODUCT_URL },
  { key: 'user',         label: 'User',         url: USER_URL },
  { key: 'order',        label: 'Order',        url: ORDER_URL },
  { key: 'payment',      label: 'Payment',      url: PAYMENT_URL },
  { key: 'inventory',    label: 'Inventory',    url: INVENTORY_URL },
  { key: 'notification', label: 'Notification', url: NOTIFY_URL },
]

const CATEGORIES = ['All', 'Laptops', 'Audio', 'Monitors', 'Keyboards', 'Smart Devices', 'Accessories']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cents(c) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)
}

function statusColor(s) {
  const m = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    CONFIRMED: 'bg-emerald-500/20 text-emerald-400',
    CANCELLED_OUT_OF_STOCK: 'bg-red-500/20 text-red-400',
    APPROVED: 'bg-emerald-500/20 text-emerald-400',
    DECLINED: 'bg-red-500/20 text-red-400',
  }
  return m[s] || 'bg-slate-700 text-slate-300'
}

// ─── Component: Header ────────────────────────────────────────────────────────
function Header({ cartCount, health, onCartClick, onOrdersClick, view }) {
  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-orange-500/30">
            S
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-400">
              ShopSphere
            </span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
              AWS EKS
            </span>
          </div>
        </div>

        {/* Service Health */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px]">
          {SERVICES.map(s => (
            <span key={s.key}
              className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
                health[s.key] === 'up'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : health[s.key] === 'down'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                health[s.key] === 'up' ? 'bg-emerald-400' :
                health[s.key] === 'down' ? 'bg-red-400' : 'bg-slate-500'
              }`} />
              {s.label}
            </span>
          ))}
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onOrdersClick}
            className={`btn-secondary text-sm flex items-center gap-2 ${view === 'orders' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : ''}`}>
            📦 My Orders
          </button>
          <button onClick={onCartClick}
            className="relative btn-secondary text-sm flex items-center gap-2">
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-slate-950 text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Component: ProductCard ───────────────────────────────────────────────────
function ProductCard({ product, onAddToCart }) {
  return (
    <div className="card overflow-hidden hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="relative overflow-hidden bg-slate-800 h-44">
        <img
          src={product.image_url || `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80`}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80' }}
        />
        <div className="absolute top-2 right-2">
          <span className="bg-slate-900/90 backdrop-blur text-xs px-2 py-1 rounded-lg text-orange-400 font-semibold border border-orange-500/20">
            {product.category}
          </span>
        </div>
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
            <span className="text-red-400 font-bold text-sm bg-slate-950/80 px-3 py-1 rounded-lg">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{product.name}</h3>
          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-400 font-extrabold text-lg">{cents(product.price_cents)}</p>
            <p className="text-slate-500 text-xs">{product.stock_quantity} in stock</p>
          </div>
          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock_quantity === 0}
            className="btn-primary text-sm py-2 px-4">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component: Cart Drawer ───────────────────────────────────────────────────
function CartDrawer({ cart, onClose, onRemove, onCheckout, checkoutState }) {
  const total = cart.reduce((s, i) => s + i.price_cents * i.qty, 0)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">🛒 Your Cart</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">Your cart is empty.</p>
          ) : cart.map(item => (
            <div key={item.id} className="flex gap-3 items-center bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <img src={item.image_url} alt={item.name}
                className="h-12 w-12 rounded-lg object-cover flex-shrink-0 bg-slate-700"
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=60&q=80' }} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                <p className="text-slate-400 text-xs">Qty: {item.qty} × {cents(item.price_cents)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-orange-400 text-sm font-bold">{cents(item.price_cents * item.qty)}</p>
                <button onClick={() => onRemove(item.id)} className="text-slate-500 hover:text-red-400 text-xs">remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-800 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total</span>
            <span className="text-white font-extrabold text-lg">{cents(total)}</span>
          </div>

          {checkoutState.error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3">
              {checkoutState.error}
            </div>
          )}
          {checkoutState.success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg p-3 space-y-1">
              <p className="font-bold">✅ Order placed! Payment {checkoutState.paymentStatus}</p>
              <p>Order: <code className="bg-slate-800 px-1 rounded">{checkoutState.orderId}</code></p>
              <p>Payment: <code className="bg-slate-800 px-1 rounded">{checkoutState.paymentId}</code></p>
            </div>
          )}

          <button
            onClick={onCheckout}
            disabled={cart.length === 0 || checkoutState.loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {checkoutState.loading ? (
              <><span className="animate-spin">⏳</span> Processing...</>
            ) : (
              <><span>⚡</span> Checkout ({cart.length} items)</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component: Orders View ───────────────────────────────────────────────────
function OrdersView({ orders, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-500">
      <span className="animate-spin mr-2">⏳</span> Loading orders...
    </div>
  )
  if (orders.length === 0) return (
    <div className="text-center py-20 text-slate-500">
      <p className="text-4xl mb-4">📦</p>
      <p className="font-semibold">No orders yet</p>
      <p className="text-sm mt-1">Place your first order to see it here.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">📦 Your Orders</h2>
      {orders.map(order => (
        <div key={order.id} className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-bold text-white font-mono text-sm">{order.id}</p>
              <p className="text-slate-500 text-xs mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`status-badge ${statusColor(order.status)}`}>{order.status}</span>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-slate-800 pt-3">
            <p className="text-slate-400 text-xs">{order.items?.length || 0} items</p>
            <p className="text-orange-400 font-bold">{cents(order.total_amount_cents)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Component: Event Feed ────────────────────────────────────────────────────
function EventFeed({ events }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live Event Stream
        </h3>
        <span className="text-xs text-slate-500">SNS → SQS</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
        {events.length === 0 ? (
          <p className="text-slate-600 py-4 text-center">[SYS] Waiting for checkout to trigger events...</p>
        ) : events.map((e, i) => (
          <div key={i} className={`p-2 rounded-lg border ${
            e.type === 'error' ? 'bg-red-950/30 border-red-900/50 text-red-400' :
            e.type === 'success' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' :
            e.type === 'payment' ? 'bg-blue-950/30 border-blue-900/50 text-blue-400' :
            'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <span className="text-slate-600">[{new Date(e.ts).toLocaleTimeString()}]</span>{' '}
            {e.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [view, setView] = useState('shop') // 'shop' | 'orders'
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [health, setHealth] = useState({})
  const [events, setEvents] = useState([])
  const [checkoutState, setCheckoutState] = useState({ loading: false, error: null, success: false })

  const DEMO_USER = { id: 'user-demo001', name: 'Alex Rivera' }

  // ── Health checks ──
  useEffect(() => {
    const check = async () => {
      const results = {}
      await Promise.all(SERVICES.map(async s => {
        try {
          const r = await fetch(`${s.url}/healthz`, { signal: AbortSignal.timeout(3000) })
          results[s.key] = r.ok ? 'up' : 'down'
        } catch { results[s.key] = 'down' }
      }))
      setHealth(results)
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  // ── Load products ──
  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'All') params.set('category', category)
      if (search) params.set('q', search)
      const r = await fetch(`${PRODUCT_URL}/api/products?${params}`)
      const data = await r.json()
      setProducts(data.products || [])
    } catch (e) {
      console.error('Products error', e)
    } finally {
      setProductsLoading(false)
    }
  }, [category, search])

  useEffect(() => { loadProducts() }, [loadProducts])

  // ── Load orders ──
  const loadOrders = useCallback(async () => {
    if (view !== 'orders') return
    setOrdersLoading(true)
    try {
      const r = await fetch(`${ORDER_URL}/api/orders`)
      const data = await r.json()
      setOrders(data.orders || [])
    } catch { setOrders([]) }
    finally { setOrdersLoading(false) }
  }, [view])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Cart operations ──
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
    addEvent({ type: 'info', msg: `[CART] Added "${product.name}" to cart` })
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const addEvent = (e) => setEvents(prev => [{ ...e, ts: Date.now() }, ...prev].slice(0, 30))

  // ── Checkout ──
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setCheckoutState({ loading: true, error: null, success: false })

    const items = cart.map(i => ({
      productId: i.id,
      productName: i.name,
      quantity: i.qty,
      unitPriceCents: i.price_cents,
    }))
    const totalAmountCents = items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0)

    try {
      // Step 1: Create order
      addEvent({ type: 'info', msg: `[ORDER] Creating order for ${items.length} item(s)...` })
      const orderRes = await fetch(`${ORDER_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER.id,
          items,
          shippingAddress: '123 Cloud Ave, AWS Region, US-EAST-1',
        }),
      })
      if (!orderRes.ok) throw new Error('Order creation failed')
      const order = await orderRes.json()
      addEvent({ type: 'success', msg: `[SNS] OrderCreated event published → order ${order.id} (PENDING)` })
      addEvent({ type: 'info', msg: `[SQS] Inventory & Notification workers consuming event...` })

      // Step 2: Process payment
      addEvent({ type: 'payment', msg: `[PAYMENT] Processing payment via ShopSphere-SimPay...` })
      const payRes = await fetch(`${PAYMENT_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          userId: DEMO_USER.id,
          amountCents: totalAmountCents,
          cardLastFour: '4242',
          cardNetwork: 'VISA',
        }),
      })
      const payment = await payRes.json()

      if (payment.status === 'APPROVED') {
        addEvent({ type: 'success', msg: `[PAYMENT] ✅ APPROVED — PaymentProcessed event → SNS` })
        addEvent({ type: 'success', msg: `[INVENTORY] Stock reserved → order ${order.id} → CONFIRMED` })
        addEvent({ type: 'info', msg: `[NOTIFICATION] Customer confirmation dispatched 📧` })
        setCart([])
        setCheckoutState({
          loading: false,
          error: null,
          success: true,
          orderId: order.id,
          paymentId: payment.id,
          paymentStatus: 'APPROVED ✅',
        })
      } else {
        addEvent({ type: 'error', msg: `[PAYMENT] ❌ DECLINED — ${payment.declineReason}` })
        setCheckoutState({ loading: false, error: `Payment declined: ${payment.declineReason}`, success: false })
      }
    } catch (err) {
      addEvent({ type: 'error', msg: `[ERROR] ${err.message}` })
      setCheckoutState({ loading: false, error: err.message, success: false })
    }
  }

  const filteredProducts = products

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        health={health}
        onCartClick={() => setShowCart(true)}
        onOrdersClick={() => setView(v => v === 'orders' ? 'shop' : 'orders')}
        view={view}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {view === 'orders' ? (
          <OrdersView orders={orders} loading={ordersLoading} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Product Catalog */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero */}
              <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-6">
                <h1 className="text-2xl font-extrabold text-white">
                  Tech Gadgets, Delivered by Microservices ⚡
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Running on <span className="text-orange-400 font-semibold">Amazon EKS</span> with
                  {' '}<span className="text-orange-400 font-semibold">6 containerized microservices</span>,
                  {' '}RDS PostgreSQL, DynamoDB, SNS/SQS event-driven architecture.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="search"
                  placeholder="🔍 Search products..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button key={c}
                      onClick={() => setCategory(c)}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
                        category === c
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="card h-72 animate-pulse bg-slate-800/50" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <p className="text-4xl mb-4">🔍</p>
                  <p>No products found. Try a different search or category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Event Feed + Architecture */}
            <div className="space-y-6">
              <EventFeed events={events} />

              {/* Architecture Info Card */}
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">🏗️ Architecture</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  {[
                    { icon: '📦', label: 'Product Service', detail: 'RDS PostgreSQL', port: '8001' },
                    { icon: '👤', label: 'User Service', detail: 'DynamoDB', port: '8002' },
                    { icon: '🛒', label: 'Order Service', detail: 'RDS + SNS', port: '8003' },
                    { icon: '💳', label: 'Payment Service', detail: 'DynamoDB + SNS', port: '8006' },
                    { icon: '📊', label: 'Inventory Service', detail: 'SQS Consumer', port: '8004' },
                    { icon: '🔔', label: 'Notification Service', detail: 'SQS Consumer', port: '8005' },
                  ].map(s => (
                    <div key={s.port} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <span>{s.icon} <span className="text-white font-medium">{s.label}</span></span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        health[s.label.toLowerCase().replace(' service', '').replace(' ', '')] === 'up'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}>{s.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        ShopSphere Microservices Platform © 2026 • Amazon EKS • Docker • Terraform • PostgreSQL • DynamoDB • SNS/SQS
      </footer>

      {/* Cart Drawer */}
      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => { setShowCart(false); setCheckoutState({ loading: false, error: null, success: false }) }}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
          checkoutState={checkoutState}
        />
      )}
    </div>
  )
}
