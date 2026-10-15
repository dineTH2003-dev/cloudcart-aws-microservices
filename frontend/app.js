// CloudCart Frontend Client
const CONFIG = {
  // Configurable base URLs; defaults point to local microservices or ingress paths
  productServiceUrl: window.PRODUCT_SERVICE_URL || 'http://localhost:8001',
  userServiceUrl: window.USER_SERVICE_URL || 'http://localhost:8002',
  orderServiceUrl: window.ORDER_SERVICE_URL || 'http://localhost:8003',
  inventoryServiceUrl: window.INVENTORY_SERVICE_URL || 'http://localhost:8004',
  notificationServiceUrl: window.NOTIFICATION_SERVICE_URL || 'http://localhost:8005',
};

// Application state
const state = {
  user: {
    id: 'user-101',
    fullName: 'Alex Rivera',
    shippingAddress: '42 Cloud Architecture Way, Seattle, WA 98101',
  },
  products: [],
  cart: {}, // productId -> { product, quantity }
};

// DOM references
const productsGrid = document.getElementById('products-grid');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartBadge = document.getElementById('cart-badge');
const cartCountLabel = document.getElementById('cart-count-label');
const cartSubtotal = document.getElementById('cart-subtotal');
const checkoutBtn = document.getElementById('checkout-btn');
const eventsLogContainer = document.getElementById('events-log-container');
const refreshProductsBtn = document.getElementById('refresh-products-btn');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAllServicesHealth();
  fetchProducts();
  setupEventListeners();

  // Poll service health every 15 seconds
  setInterval(checkAllServicesHealth, 15000);
});

function setupEventListeners() {
  refreshProductsBtn.addEventListener('click', fetchProducts);
  checkoutBtn.addEventListener('click', handleCheckout);
}

// 1. Fetch & Render Products
async function fetchProducts() {
  productsGrid.innerHTML = `
    <div class="col-span-2 text-center py-12 text-slate-500">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
      <p>Loading products from Product Service...</p>
    </div>
  `;

  try {
    const res = await fetch(`${CONFIG.productServiceUrl}/api/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.products = data.products || [];
    renderProducts();
  } catch (err) {
    productsGrid.innerHTML = `
      <div class="col-span-2 bg-red-950/40 border border-red-800 p-6 rounded-xl text-center text-red-300">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2 text-red-400"></i>
        <p class="font-bold">Failed to load product catalog</p>
        <p class="text-xs text-red-400 mt-1">${err.message}</p>
        <p class="text-xs text-slate-400 mt-3">Ensure Product Service is running at ${CONFIG.productServiceUrl}</p>
      </div>
    `;
  }
}

function renderProducts() {
  if (state.products.length === 0) {
    productsGrid.innerHTML = `<p class="col-span-2 text-center py-8 text-slate-400">No products available in catalog.</p>`;
    return;
  }

  productsGrid.innerHTML = state.products
    .map((product) => {
      const priceFormatted = `$${(product.price_cents / 100).toFixed(2)}`;
      const inStock = product.stock_quantity > 0;
      return `
      <div class="bg-slate-800/80 rounded-xl border border-slate-700/80 p-4 flex flex-col justify-between hover:border-amber-500/50 transition shadow-lg">
        <div>
          <div class="h-36 w-full rounded-lg overflow-hidden bg-slate-900 mb-3 relative">
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400'}" alt="${product.name}" class="h-full w-full object-cover">
            <span class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${
              inStock ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
            }">
              ${inStock ? `${product.stock_quantity} in stock` : 'Out of stock'}
            </span>
          </div>
          <span class="text-[10px] uppercase tracking-wider text-amber-400 font-bold">${product.category}</span>
          <h4 class="font-bold text-white text-base mt-1 line-clamp-1">${product.name}</h4>
          <p class="text-xs text-slate-400 mt-1 line-clamp-2">${product.description || ''}</p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
          <span class="text-lg font-black text-white">${priceFormatted}</span>
          <button 
            onclick="addToCart('${product.id}')"
            ${!inStock ? 'disabled' : ''}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
              inStock
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }">
            <i class="fa-solid fa-cart-plus"></i>
            <span>Add</span>
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

// 2. Shopping Cart Management
window.addToCart = function (productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product || product.stock_quantity <= 0) return;

  if (state.cart[productId]) {
    if (state.cart[productId].quantity < product.stock_quantity) {
      state.cart[productId].quantity += 1;
    }
  } else {
    state.cart[productId] = { product, quantity: 1 };
  }
  updateCartUI();
};

window.removeFromCart = function (productId) {
  if (state.cart[productId]) {
    state.cart[productId].quantity -= 1;
    if (state.cart[productId].quantity <= 0) {
      delete state.cart[productId];
    }
  }
  updateCartUI();
};

function updateCartUI() {
  const items = Object.values(state.cart);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = items.reduce((sum, item) => sum + item.quantity * item.product.price_cents, 0);

  cartBadge.innerText = totalItemsCount;
  cartCountLabel.innerText = `${totalItemsCount} items`;
  cartSubtotal.innerText = `$${(totalCents / 100).toFixed(2)}`;
  checkoutBtn.disabled = totalItemsCount === 0;

  if (items.length === 0) {
    cartItemsContainer.innerHTML = `<p class="text-slate-500 text-sm text-center py-8">Your cart is currently empty.</p>`;
    return;
  }

  cartItemsContainer.innerHTML = items
    .map(
      ({ product, quantity }) => `
      <div class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60 text-xs">
        <div class="flex-1 mr-2">
          <p class="font-bold text-slate-200 line-clamp-1">${product.name}</p>
          <p class="text-slate-400">$${(product.price_cents / 100).toFixed(2)} each</p>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="removeFromCart('${product.id}')" class="h-6 w-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">-</button>
          <span class="font-bold text-white px-1">${quantity}</span>
          <button onclick="addToCart('${product.id}')" class="h-6 w-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">+</button>
        </div>
      </div>
    `
    )
    .join('');
}

// 3. Checkout & Asynchronous Event Simulation
async function handleCheckout() {
  const items = Object.values(state.cart).map(({ product, quantity }) => ({
    productId: product.id,
    productName: product.name,
    quantity,
    unitPriceCents: product.price_cents,
  }));

  if (items.length === 0) return;

  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Processing...`;

  logEvent('INFO', `[OrderService] Initiating order checkout for user ${state.user.id}...`);

  try {
    const res = await fetch(`${CONFIG.orderServiceUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.user.id,
        items,
        shippingAddress: state.user.shippingAddress,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const order = await res.json();
    logEvent('SUCCESS', `[OrderService] Order #${order.id} created with status: PENDING`);
    logEvent('SNS', `[SNS] Event published: OrderCreated -> Topic: cloudcart-order-events`);
    logEvent('SQS', `[SQS] Fanout to queues: cloudcart-inventory-queue & cloudcart-notification-queue`);

    // Clear cart
    state.cart = {};
    updateCartUI();

    // Start polling to show asynchronous fulfillment
    pollOrderFulfillment(order.id);
  } catch (err) {
    logEvent('ERROR', `[OrderService] Checkout failed: ${err.message}`);
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = `<i class="fa-solid fa-bolt mr-2"></i>Checkout with Microservices`;
  }
}

// Poll order status & notifications
async function pollOrderFulfillment(orderId) {
  let attempts = 0;
  const maxAttempts = 10;

  const interval = setInterval(async () => {
    attempts += 1;
    try {
      // 1. Check Order Status
      const orderRes = await fetch(`${CONFIG.orderServiceUrl}/api/orders/${orderId}`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        if (orderData.status === 'CONFIRMED') {
          logEvent('INVENTORY', `[InventoryService] SQS consumer processed stock reservation: Order #${orderId} CONFIRMED!`);
          clearInterval(interval);
          fetchProducts(); // Refresh catalog stock count
        } else if (orderData.status === 'CANCELLED_OUT_OF_STOCK') {
          logEvent('WARN', `[InventoryService] Order #${orderId} was CANCELLED due to out-of-stock items.`);
          clearInterval(interval);
          fetchProducts();
        }
      }

      // 2. Check Notification Dispatch
      const notifRes = await fetch(`${CONFIG.notificationServiceUrl}/api/notifications?orderId=${orderId}`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        if (notifData.count > 0) {
          logEvent('NOTIF', `[NotificationService] SQS consumer dispatched email to ${notifData.notifications[0].recipientEmail}`);
        }
      }
    } catch (_err) {
      // Ignore transient polling errors
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 1500);
}

// 4. Live Log Appender
function logEvent(type, message) {
  const time = new Date().toLocaleTimeString();
  let badgeClass = 'text-slate-400';

  if (type === 'SUCCESS') badgeClass = 'text-emerald-400 font-bold';
  if (type === 'SNS') badgeClass = 'text-amber-400 font-bold';
  if (type === 'SQS') badgeClass = 'text-cyan-400 font-bold';
  if (type === 'INVENTORY') badgeClass = 'text-purple-400 font-bold';
  if (type === 'NOTIF') badgeClass = 'text-teal-400 font-bold';
  if (type === 'ERROR') badgeClass = 'text-rose-400 font-bold';
  if (type === 'WARN') badgeClass = 'text-orange-400 font-bold';

  const row = document.createElement('div');
  row.className = 'bg-slate-900/90 p-2 rounded border border-slate-800 text-[11px] leading-tight';
  row.innerHTML = `<span class="text-slate-500">[${time}]</span> <span class="${badgeClass}">${message}</span>`;

  eventsLogContainer.prepend(row);
}

// 5. Service Health Checks
async function checkAllServicesHealth() {
  const services = [
    { id: 'health-product', url: `${CONFIG.productServiceUrl}/healthz` },
    { id: 'health-user', url: `${CONFIG.userServiceUrl}/healthz` },
    { id: 'health-order', url: `${CONFIG.orderServiceUrl}/healthz` },
    { id: 'health-inventory', url: `${CONFIG.inventoryServiceUrl}/healthz` },
    { id: 'health-notification', url: `${CONFIG.notificationServiceUrl}/healthz` },
  ];

  for (const { id, url } of services) {
    const el = document.getElementById(id);
    if (!el) continue;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        el.className = 'px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-semibold';
        el.innerHTML = `<i class="fa-solid fa-circle text-[7px] mr-1 text-emerald-400"></i>${el.innerText.replace(/^[•\s\w]+Product/, 'Product').replace(/^[•\s\w]+User/, 'User').replace(/^[•\s\w]+Order/, 'Order').replace(/^[•\s\w]+Inventory/, 'Inventory').replace(/^[•\s\w]+Notification/, 'Notification')}`;
      } else {
        throw new Error();
      }
    } catch (_err) {
      el.className = 'px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500';
    }
  }
}
