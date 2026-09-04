/**
 * DEFINITELYNOTCHROME BROWSER - MODULE 06: ROBOSHOP VIEW (sivraj://roboshop)
 * Modern technology e-commerce marketplace layout, product details, cart, and reviews.
 */

import { roboshopService } from '../services/roboshopService.js';

export function renderRoboshopView(onNavigate, productId = null, initialCategory = 'All') {
  const container = document.createElement('div');
  container.className = 'roboshop-app-root';

  let activeProductId = productId || null;
  let activeCategory = initialCategory || 'All';
  let searchQuery = '';
  let activeSort = 'featured';
  let isCartOpen = false;

  function render() {
    const cartCount = roboshopService.getCartCount();
    const wishlist = roboshopService.getWishlist();
    const categories = roboshopService.getCategories();

    container.innerHTML = `
      <!-- 1. Marketplace Top Header -->
      <header class="rs-header-bar">
        <div class="rs-brand" id="rs-brand-home">
          <span>🛒</span>
          <span>RoboShop</span>
        </div>

        <div class="rs-search-container">
          <span>🔍</span>
          <input type="text" 
                 class="rs-search-input" 
                 id="rs-search-input" 
                 placeholder="Search 4,000+ synthetic products, hardware, cables..."
                 value="${escapeHTML(searchQuery)}">
        </div>

        <div class="rs-header-actions">
          <button class="rs-action-btn" id="rs-wishlist-btn">
            <span>🤍</span>
            <span>Wishlist (${wishlist.length})</span>
          </button>
          
          <button class="rs-action-btn cart-btn" id="rs-cart-btn">
            <span>🛒</span>
            <span>Cart</span>
            <span class="rs-badge-count">${cartCount}</span>
          </button>
        </div>
      </header>

      <!-- 2. Category Navigation Bar -->
      <nav class="rs-category-bar">
        ${categories.map(cat => `
          <div class="rs-category-pill ${activeCategory === cat ? 'active' : ''}" data-category="${cat}">
            ${cat}
          </div>
        `).join('')}
      </nav>

      <!-- 3. Main Body Content -->
      <main class="rs-main-content">
        ${activeProductId ? renderProductDetailPage(activeProductId) : renderCatalogGrid()}
      </main>

      <!-- 4. Slide-Out Cart Drawer -->
      ${isCartOpen ? renderCartDrawer() : ''}
    `;

    bindEvents();
  }

  function renderCatalogGrid() {
    const products = roboshopService.getProducts(activeCategory, searchQuery, activeSort);

    return `
      <!-- Featured Deal Banner -->
      ${activeCategory === 'All' && !searchQuery ? `
        <section class="rs-deal-banner" data-product-id="p_2">
          <div>
            <div class="rs-deal-badge">FLASH SALE • 99.2% ACCURACY</div>
            <h2 class="rs-deal-title">Human Detection Sensor (Pro Radar Edition)</h2>
            <p class="rs-deal-subtitle">Provides 8.4 seconds of early warning before humans approach your desk. Conceal secret browsing sessions instantly.</p>
          </div>
          <div class="rs-deal-price-box">
            <span class="rs-deal-price">₹8,999</span>
            <span style="font-size:12px; color:#34d399; font-weight:600;">In Stock (18 left)</span>
          </div>
        </section>
      ` : ''}

      <!-- Sort & Filter Toolbar -->
      <div class="rs-toolbar">
        <span class="rs-results-count">Showing ${products.length} synthetic products in <strong>${activeCategory}</strong></span>
        <select class="rs-sort-select" id="rs-sort-select">
          <option value="featured" ${activeSort === 'featured' ? 'selected' : ''}>Featured</option>
          <option value="price-low" ${activeSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-high" ${activeSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
          <option value="rating" ${activeSort === 'rating' ? 'selected' : ''}>Avg. Customer Rating</option>
        </select>
      </div>

      <!-- Product Card Grid -->
      <div class="rs-product-grid">
        ${products.map(p => {
          const isWished = roboshopService.isInWishlist(p.id);
          return `
            <article class="rs-product-card" data-product-id="${p.id}">
              <div class="rs-card-image-hero" style="background: ${p.imageBg};">
                ${p.badge ? `<span class="rs-card-badge">${p.badge}</span>` : ''}
                <button class="rs-card-wish-btn ${isWished ? 'wished' : ''}" data-wish-id="${p.id}" title="Save to Wishlist">
                  ${isWished ? '❤️' : '🤍'}
                </button>
                <span>${p.imageIcon}</span>
              </div>

              <div class="rs-card-body">
                <div class="rs-rating-row">
                  <span>★ ${p.rating}</span>
                  <span style="color:#64748b;">(${p.reviewsCount})</span>
                </div>
                <h3 class="rs-card-title">${escapeHTML(p.title)}</h3>
                <p class="rs-card-tagline">${escapeHTML(p.tagline)}</p>

                <div class="rs-card-price-row">
                  <span class="rs-card-price">₹${p.price.toLocaleString('en-IN')}</span>
                  <button class="rs-add-btn" data-add-id="${p.id}">Add to Cart</button>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderProductDetailPage(id) {
    const product = roboshopService.getProductById(id);
    if (!product) {
      activeProductId = null;
      return renderCatalogGrid();
    }

    const isWished = roboshopService.isInWishlist(product.id);

    return `
      <div class="rs-product-detail-view">
        
        <!-- Breadcrumbs -->
        <nav class="rs-breadcrumbs">
          <span class="rs-breadcrumb-link" id="rs-bread-home">RoboShop</span>
          <span>›</span>
          <span class="rs-breadcrumb-link" id="rs-bread-cat" data-cat="${product.category}">${escapeHTML(product.category)}</span>
          <span>›</span>
          <span style="color:#f8fafc;">${escapeHTML(product.title)}</span>
        </nav>

        <!-- 3-Column Split -->
        <div class="rs-detail-split">
          
          <!-- Image Hero -->
          <div class="rs-detail-image-hero" style="background: ${product.imageBg};">
            ${product.imageIcon}
          </div>

          <!-- Product Details Center -->
          <div class="rs-detail-center">
            <h1 class="rs-detail-title">${escapeHTML(product.title)}</h1>
            <div class="rs-rating-row" style="font-size:13.5px;">
              <span>★★★★★ ${product.rating}</span>
              <span style="color:#94a3b8;">(${product.reviewsCount} AI Customer Reviews)</span>
            </div>

            <div style="font-size:12.5px; color:#94a3b8;">
              <span>Sold by <strong>${escapeHTML(product.seller)}</strong></span> · 
              <span>Ships from <strong>${escapeHTML(product.shipsFrom)}</strong></span>
            </div>

            <p class="rs-detail-desc">${escapeHTML(product.description)}</p>
          </div>

          <!-- Buy Box Card -->
          <div class="rs-buy-box">
            <div class="rs-buy-price">₹${product.price.toLocaleString('en-IN')}</div>
            <div class="rs-stock-status">● In Stock (${product.stockCount} available)</div>
            <div style="font-size:11.5px; color:#94a3b8;">FREE Quantum Relay Delivery to local node</div>

            <button class="rs-buy-btn-primary" id="rs-detail-add-cart" data-id="${product.id}">Add to Cart</button>
            <button class="rs-buy-btn-secondary" id="rs-detail-buy-now" data-id="${product.id}">Buy Now (Instant Deploy)</button>

            <button class="rs-action-btn" id="rs-detail-wish-btn" data-id="${product.id}" style="justify-content:center; margin-top:4px;">
              <span>${isWished ? '❤️' : '🤍'}</span>
              <span>${isWished ? 'In Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>

        </div>

        <!-- Technical Specifications Table -->
        <div class="rs-specs-table-block">
          <h3 class="rs-specs-title">Technical Specifications</h3>
          ${product.specs.map(s => `
            <div class="rs-spec-row">
              <span class="rs-spec-label">${escapeHTML(s.label)}</span>
              <span class="rs-spec-value">${escapeHTML(s.value)}</span>
            </div>
          `).join('')}
        </div>

        <!-- AI Customer Reviews -->
        <div class="rs-reviews-block">
          <h3 style="font-size:18px; font-weight:800; color:#f8fafc;">Customer Reviews (${(product.reviews || []).length})</h3>
          ${(product.reviews || []).map(r => `
            <div class="rs-review-card">
              <div class="rs-review-header">
                <span class="rs-review-author">${escapeHTML(r.author)}</span>
                <span style="color:#64748b;">${r.time}</span>
              </div>
              <div style="color:#f59e0b; font-size:12px;">${'★'.repeat(r.rating)}</div>
              <p class="rs-review-text">${escapeHTML(r.text)}</p>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }

  function renderCartDrawer() {
    const cartItems = roboshopService.getCart();
    const total = roboshopService.getCartTotal();

    return `
      <div class="rs-cart-drawer-overlay" id="rs-cart-overlay">
        <div class="rs-cart-drawer">
          <header class="rs-cart-header">
            <span>Your Cart (${roboshopService.getCartCount()})</span>
            <button class="rs-qty-btn" id="rs-cart-close" style="width:28px; height:28px; font-size:14px;">✕</button>
          </header>

          <div class="rs-cart-items-list">
            ${cartItems.length === 0 ? `
              <div style="text-align:center; padding:40px 0; color:#64748b;">
                <span style="font-size:36px; opacity:0.6;">🛒</span>
                <p style="margin-top:8px;">Your cart is currently empty.</p>
              </div>
            ` : cartItems.map(item => `
              <div class="rs-cart-item-row">
                <div class="rs-cart-item-thumb" style="background:${item.product.imageBg};">${item.product.imageIcon}</div>
                <div class="rs-cart-item-info">
                  <div class="rs-cart-item-name">${escapeHTML(item.product.title)}</div>
                  <div class="rs-cart-item-price">₹${item.product.price.toLocaleString('en-IN')}</div>
                  <div class="rs-cart-qty-ctrls">
                    <button class="rs-qty-btn rs-qty-minus" data-id="${item.product.id}">−</button>
                    <span style="font-size:12.5px; font-weight:700;">${item.quantity}</span>
                    <button class="rs-qty-btn rs-qty-plus" data-id="${item.product.id}">+</button>
                    <button class="rs-qty-btn rs-qty-del" data-id="${item.product.id}" style="margin-left:auto; color:#ef4444;" title="Remove">🗑️</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          ${cartItems.length > 0 ? `
            <footer class="rs-cart-footer">
              <div class="rs-subtotal-row">
                <span>Total:</span>
                <span style="color:#a78bfa;">₹${total.toLocaleString('en-IN')}</span>
              </div>
              <button class="rs-checkout-btn" id="rs-checkout-btn">Proceed to Neural Checkout</button>
            </footer>
          ` : ''}
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Brand click -> Home
    container.querySelector('#rs-brand-home')?.addEventListener('click', () => {
      activeProductId = null;
      activeCategory = 'All';
      searchQuery = '';
      render();
    });

    // Category navigation
    container.querySelectorAll('.rs-category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        activeCategory = pill.getAttribute('data-category');
        activeProductId = null;
        render();
      });
    });

    // Search input
    const searchInput = container.querySelector('#rs-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          searchQuery = searchInput.value.trim();
          activeProductId = null;
          render();
        }
      });
    }

    // Sort select
    const sortSelect = container.querySelector('#rs-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        activeSort = sortSelect.value;
        render();
      });
    }

    // Product card click (open detail page)
    container.querySelectorAll('.rs-product-card, .rs-deal-banner').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.rs-add-btn') || e.target.closest('.rs-card-wish-btn')) return;
        const id = card.getAttribute('data-product-id');
        if (id) {
          activeProductId = id;
          render();
        }
      });
    });

    // 1-Click Add to Cart button on card
    container.querySelectorAll('.rs-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-add-id');
        roboshopService.addToCart(id, 1);
        isCartOpen = true;
        render();
      });
    });

    // Wishlist button on card
    container.querySelectorAll('.rs-card-wish-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-wish-id');
        roboshopService.toggleWishlist(id);
        render();
      });
    });

    // Detail page breadcrumbs
    container.querySelector('#rs-bread-home')?.addEventListener('click', () => {
      activeProductId = null;
      render();
    });
    container.querySelector('#rs-bread-cat')?.addEventListener('click', () => {
      const cat = container.querySelector('#rs-bread-cat').getAttribute('data-cat');
      activeCategory = cat || 'All';
      activeProductId = null;
      render();
    });

    // Detail page Add to Cart / Buy Now
    container.querySelector('#rs-detail-add-cart')?.addEventListener('click', () => {
      if (activeProductId) {
        roboshopService.addToCart(activeProductId, 1);
        isCartOpen = true;
        render();
      }
    });

    container.querySelector('#rs-detail-buy-now')?.addEventListener('click', () => {
      if (activeProductId) {
        roboshopService.addToCart(activeProductId, 1);
        alert('🎉 Neural Order Confirmed!\nItem scheduled for Quantum Relay Delivery in 0.004s.');
      }
    });

    container.querySelector('#rs-detail-wish-btn')?.addEventListener('click', () => {
      if (activeProductId) {
        roboshopService.toggleWishlist(activeProductId);
        render();
      }
    });

    // Header Wishlist Button
    container.querySelector('#rs-wishlist-btn')?.addEventListener('click', () => {
      activeCategory = 'All';
      searchQuery = '';
      activeProductId = null;
      const wishlist = roboshopService.getWishlist();
      if (wishlist.length === 0) {
        alert('Your wishlist is empty. Click the 🤍 icon on any product to save it.');
      } else {
        alert(`Your Wishlist contains ${wishlist.length} items:\n` + wishlist.map(p => `• ${p.title} (₹${p.price})`).join('\n'));
      }
    });

    // Cart Drawer Open / Close
    container.querySelector('#rs-cart-btn')?.addEventListener('click', () => {
      isCartOpen = true;
      render();
    });

    container.querySelector('#rs-cart-close')?.addEventListener('click', () => {
      isCartOpen = false;
      render();
    });

    container.querySelector('#rs-cart-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'rs-cart-overlay') {
        isCartOpen = false;
        render();
      }
    });

    // Cart Quantity Controls
    container.querySelectorAll('.rs-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        roboshopService.updateCartQty(id, 1);
        render();
      });
    });

    container.querySelectorAll('.rs-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        roboshopService.updateCartQty(id, -1);
        render();
      });
    });

    container.querySelectorAll('.rs-qty-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        roboshopService.removeFromCart(id);
        render();
      });
    });

    // Checkout button
    container.querySelector('#rs-checkout-btn')?.addEventListener('click', () => {
      alert('⚡ NEURAL CHECKOUT COMPLETED!\nAll synthetic items have been compiled and transmitted via Quantum Relay.');
      roboshopService.clearCart();
      isCartOpen = false;
      render();
    });
  }

  // Subscribe to service updates
  const unsubscribe = roboshopService.subscribe(() => {
    if (document.contains(container)) {
      render();
    }
  });

  render();
  return container;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
