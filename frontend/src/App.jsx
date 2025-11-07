import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', address: '', email: '', phone: '' });
  const [toastMessage, setToastMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Convert USD to INR (assuming 1 USD = 83 INR)
  const USD_TO_INR_RATE = 83;
  const convertToINR = (usdPrice) => Math.round(usdPrice * USD_TO_INR_RATE);

  useEffect(() => {
    fetchProducts();
    fetchCart();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API_URL}/cart`);
      setCart(response.data);
    } catch (err) {
      setError('Failed to fetch cart. Please try again later.');
    }
  };

  const addToCart = async (productId) => {
    try {
      await axios.post(`${API_URL}/cart`, { productId, quantity: 1 });
      fetchCart();
      setToastMessage('Item added to cart!');
      setTimeout(() => setToastMessage(''), 3000); // Hide after 3 seconds
    } catch (err) {
      setError('Failed to add item to cart.');
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/cart/${itemId}`);
      fetchCart();
    } catch (err) {
      setError('Failed to remove item from cart.');
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    try {
      await axios.put(`${API_URL}/cart/${itemId}`, { quantity: newQuantity });
      fetchCart();
    } catch (err) {
      setError('Failed to update item quantity.');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/checkout`, { customerInfo });
      setReceipt(response.data);
      setIsCheckoutVisible(false);
      setIsReceiptVisible(true);
      fetchCart(); // to clear the cart on the frontend
    } catch (err) {
      setError('Checkout failed. Please try again.');
    }
  };

  const handleCustomerInfoChange = (e) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const viewDetails = (product) => {
    setSelectedProduct(product);
  };

  const closeDetails = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>E-Commerce Store</h1>
        <button className="cart-button" onClick={() => setIsCartVisible(!isCartVisible)}>
          <span className="btn-icon">🛒</span>
          Cart ({cart.items.length})
        </button>
      </header>

      {toastMessage && <div className="toast">{toastMessage}</div>}

      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading products...</p> : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <img src={product.image} alt={product.name} />
                <div className="product-overlay">
                  <button className="quick-view-btn" onClick={() => viewDetails(product)}>
                    Quick View
                  </button>
                </div>
              </div>
              <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-category">{product.category}</p>
                <div className="product-price-container">
                  <span className="product-price">₹{convertToINR(product.price)}</span>
                  <span className="original-price">₹{convertToINR(product.price * 1.2)}</span>
                  <span className="discount-badge">20% OFF</span>
                </div>
                <button className="add-to-cart-btn" onClick={() => addToCart(product.id)}>
                  <span className="btn-icon">🛒</span>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="details-modal">
          <div className="details-content">
            <div className="details-image">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
            </div>
            <div className="details-info">
              <h2 className="details-title">{selectedProduct.name}</h2>
              <p className="details-category">{selectedProduct.category}</p>
              <div className="details-price-container">
                <span className="details-price">₹{convertToINR(selectedProduct.price)}</span>
                <span className="details-original-price">₹{convertToINR(selectedProduct.price * 1.3)}</span>
                <span className="details-discount">30% OFF</span>
              </div>
              <p className="details-description">{selectedProduct.description}</p>
              <div className="details-actions">
                <button className="add-to-cart-btn" onClick={() => addToCart(selectedProduct.id)}>
                  <span className="btn-icon">🛒</span>
                  Add to Cart
                </button>
                <button className="close-btn" onClick={closeDetails}>
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCartVisible && (
        <div className="cart-modal">
          <h2>Shopping Cart</h2>
          {cart.items.length === 0 ? <p>Your cart is empty.</p> : (
            <>
              <div className="cart-items">
                {cart.items.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image} alt={item.name} />
                    <div className="item-details">
                      <h4 className="item-title">{item.name}</h4>
                      <p className="item-price">₹{convertToINR(item.price)}</p>
                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span className="quantity">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>🗑️</button>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <div className="total-breakdown">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>₹{convertToINR(cart.total)}</span>
                  </div>
                  <div className="total-row">
                    <span>Shipping:</span>
                    <span>FREE</span>
                  </div>
                  <div className="total-row final-total">
                    <span>Total:</span>
                    <span>₹{convertToINR(cart.total)}</span>
                  </div>
                </div>
                <button className="checkout-btn" onClick={() => { setIsCartVisible(false); setIsCheckoutVisible(true); }}>
                  Proceed to Checkout
                </button>
                <button className="continue-btn" onClick={() => setIsCartVisible(false)}>
                  Continue Shopping
                </button>
              </div>
            </>
          )}
          <button onClick={() => setIsCartVisible(false)}>Close</button>
        </div>
      )}

      {isCheckoutVisible && (
        <div className="checkout-modal">
          <h2>Checkout</h2>
          <form onSubmit={handleCheckout}>
            <div className="checkout-content">
              <div className="checkout-form-section">
                <h3>Delivery Information</h3>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Address *</label>
                  <textarea
                    placeholder="Enter your complete address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="checkout-summary">
                <h3>Order Summary</h3>
                <div className="summary-items">
                  {cart.items.map(item => (
                    <div key={item.id} className="summary-item">
                      <img src={item.image} alt={item.name} />
                      <div className="summary-item-details">
                        <span className="item-name">{item.name}</span>
                        <span className="item-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="item-price">₹{convertToINR(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="summary-total">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>₹{convertToINR(cart.total)}</span>
                  </div>
                  <div className="total-row">
                    <span>Shipping:</span>
                    <span>FREE</span>
                  </div>
                  <div className="total-row final-total">
                    <span>Total:</span>
                    <span>₹{convertToINR(cart.total)}</span>
                  </div>
                </div>
                <button type="submit" className="place-order-btn">
                  Place Order - ₹{convertToINR(cart.total)}
                </button>
                <button type="button" className="cancel-btn" onClick={() => setIsCheckoutVisible(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isReceiptVisible && receipt && (
        <div className="receipt-modal">
          <div className="receipt-content">
            <div className="receipt-header">
              <h2>Order Confirmed!</h2>
              <p>Thank you for your purchase, {receipt.customer.name}!</p>
            </div>
            <div className="receipt-details">
              <div className="receipt-info">
                <p><strong>Order Date:</strong> {new Date(receipt.date).toLocaleDateString()}</p>
                <p><strong>Order ID:</strong> #{receipt.orderId}</p>
              </div>
              <div className="shipping-info">
                <h4>Shipping to:</h4>
                <p>{receipt.customer.name}</p>
                <p>{receipt.customer.address}</p>
                <p>{receipt.customer.email}</p>
                <p>{receipt.customer.phone}</p>
              </div>
            </div>
            <div className="receipt-items">
              <h4>Items Ordered:</h4>
              {receipt.items.map((item, index) => (
                <div key={index} className="receipt-item">
                  <span className="item-name">{item.name} (x{item.quantity})</span>
                  <span className="item-price">₹{convertToINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="receipt-total">
              <div className="total-row final-total">
                <span>Total Paid:</span>
                <span>₹{convertToINR(receipt.total)}</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsReceiptVisible(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;