import { useState, useEffect, useCallback } from 'react';
import { getRestaurants, getRestaurant } from '../api/restaurants';
import { getMenuItems } from '../api/menuItems';
import { placeOrder } from '../api/orders';
import { getReviews, createReview } from '../api/reviews';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { getImageUrl } from '../api/client';

const CUISINE_OPTIONS = ['Italian','Chinese','Indian','Mexican','Japanese','American','Thai','Mediterranean','Other'];

export default function BrowsePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restaurant list
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState(null);
  const [search, setSearch]           = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');

  // Selected restaurant + its menu
  const [selected, setSelected]       = useState(null); // restaurant object
  const [menuItems, setMenuItems]     = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  // Cart: { [menuItemId]: { item, quantity } }
  const [cart, setCart] = useState({});

  // Order form
  const [address, setAddress]           = useState('');
  const [notes, setNotes]               = useState('');
  const [orderError, setOrderError]     = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [placing, setPlacing]           = useState(false);

  // Reviews
  const [reviews, setReviews]           = useState([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError]   = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewHover, setReviewHover]   = useState(0);

  // ── fetch restaurants ──────────────────────────────────────
  const fetchRestaurants = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const params = { isOpen: 'true' };
      if (search)        params.search  = search;
      if (filterCuisine) params.cuisine = filterCuisine;
      const res = await getRestaurants(params);
      setRestaurants(res.data.restaurants);
    } catch {
      setFetchError('Failed to load restaurants.');
    } finally {
      setLoading(false);
    }
  }, [search, filterCuisine]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  // ── reorder hook: triggered after restaurants list is loaded ──
  useEffect(() => {
    if (loading) return;
    const rid   = localStorage.getItem('fooddash_reorder_restaurant_id');
    const items = localStorage.getItem('fooddash_reorder_items');
    if (!rid || !items) return;
    localStorage.removeItem('fooddash_reorder_restaurant_id');
    localStorage.removeItem('fooddash_reorder_items');

    const parsedItems = JSON.parse(items);
    // Find restaurant in already-loaded list first, then fall back to a fetch
    const tryOpen = async () => {
      let restaurant = restaurants.find((r) => r.id === parseInt(rid, 10));
      if (!restaurant) {
        try { restaurant = (await getRestaurant(rid)).data.restaurant; } catch { return; }
      }
      // Load menu
      setSelected(restaurant);
      setCart({});
      setFilterCategory('');
      setOrderError([]);
      setOrderSuccess(null);
      if (user?.defaultAddress) setAddress(user.defaultAddress);
      setMenuLoading(true);
      try {
        const menuRes = await getMenuItems({ restaurantId: restaurant.id, isAvailable: 'true' });
        const menuMap = Object.fromEntries(menuRes.data.items.map((i) => [i.id, i]));
        const reorderCart = {};
        parsedItems.forEach(({ id, quantity }) => {
          if (menuMap[id]) reorderCart[id] = { item: menuMap[id], quantity };
        });
        setMenuItems(menuRes.data.items);
        setCart(reorderCart);
        setOrderSuccess('Cart pre-filled from your previous order. Review and place your order!');
      } catch {
        setMenuItems([]);
      } finally {
        setMenuLoading(false);
      }
    };
    tryOpen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── open restaurant / load menu ───────────────────────────
  const openRestaurant = async (r) => {
    setSelected(r);
    setCart({});
    setFilterCategory('');
    setOrderError([]);
    setOrderSuccess(null);
    if (user?.defaultAddress) {
      setAddress(user.defaultAddress);
    } else {
      setAddress('');
    }
    setMenuLoading(true);
    try {
      const res = await getMenuItems({ restaurantId: r.id, isAvailable: 'true' });
      setMenuItems(res.data.items);
      fetchReviews(r.id);
    } catch {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const closeRestaurant = () => {
    setSelected(null); setMenuItems([]); setCart({});
    setOrderError([]); setOrderSuccess(null);
    setReviews([]); setReviewRating(0); setReviewComment(''); setReviewError(''); setReviewSuccess('');
  };

  // fetch reviews when a restaurant is opened
  const fetchReviews = useCallback(async (restaurantId) => {
    try {
      const res = await getReviews(restaurantId);
      setReviews(res.data.reviews);
    } catch { setReviews([]); }
  }, []);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError(''); setReviewSuccess('');
    if (reviewRating === 0) { setReviewError('Please select a star rating.'); return; }
    setReviewSubmitting(true);
    try {
      await createReview(selected.id, { rating: reviewRating, comment: reviewComment });
      setReviewSuccess('Review submitted!');
      setReviewRating(0); setReviewComment('');
      fetchReviews(selected.id);
    } catch (err) {
      const d = err.response?.data?.error || err.response?.data?.details;
      setReviewError(Array.isArray(d) ? d.join(' ') : (d || 'Failed to submit review.'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── cart helpers ──────────────────────────────────────────
  const addToCart = (item) =>
    setCart((c) => ({ ...c, [item.id]: { item, quantity: (c[item.id]?.quantity || 0) + 1 } }));

  const removeFromCart = (itemId) =>
    setCart((c) => {
      const next = { ...c };
      if (next[itemId]?.quantity > 1) next[itemId] = { ...next[itemId], quantity: next[itemId].quantity - 1 };
      else delete next[itemId];
      return next;
    });

  const cartLines  = Object.values(cart);
  const cartTotal  = cartLines.reduce((s, l) => s + parseFloat(l.item.price) * l.quantity, 0);
  const cartCount  = cartLines.reduce((s, l) => s + l.quantity, 0);

  const categories = [...new Set(menuItems.map((i) => i.category))].sort();
  const visibleItems = filterCategory
    ? menuItems.filter((i) => i.category === filterCategory)
    : menuItems;

  // ── place order ───────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user) { navigate('/login'); return; }
    const errs = [];
    if (!address.trim()) errs.push('Delivery address is required.');
    else if (address.trim().length < 5) errs.push('Delivery address must be at least 5 characters.');
    if (cartLines.length === 0) errs.push('Your cart is empty.');
    if (errs.length) { setOrderError(errs); return; }

    setPlacing(true); setOrderError([]);
    try {
      await placeOrder({
        restaurantId:    selected.id,
        deliveryAddress: address.trim(),
        notes:           notes.trim(),
        items:           cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
      });
      setOrderSuccess('Order placed! You can track it under My Orders.');
      setCart({});
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data?.error;
      setOrderError(Array.isArray(detail) ? detail : [detail || 'Failed to place order.']);
    } finally {
      setPlacing(false);
    }
  };

  // ── render ────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="page">
        <button className="btn btn-outline btn-sm back-btn" onClick={closeRestaurant}>
          &larr; Back to restaurants
        </button>

        <div className="restaurant-header">
          {selected.imageUrl
            ? <img src={getImageUrl(selected.imageUrl)} alt={selected.name} className="restaurant-hero" />
            : <div className="restaurant-hero-placeholder" />}
          <div className="restaurant-header-info">
            <h1>{selected.name}</h1>
            <p className="card-meta">{selected.cuisine} &middot; {selected.address}</p>
            {selected.phone && <p className="card-meta">{selected.phone}</p>}
          </div>
        </div>

        <div className="browse-layout">
          {/* ── Menu side ── */}
          <section className="menu-section">
            <div className="section-bar">
              <h2>Menu</h2>
              <div className="category-tabs">
                <button
                  className={`tab-btn ${!filterCategory ? 'active' : ''}`}
                  onClick={() => setFilterCategory('')}
                >All</button>
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`tab-btn ${filterCategory === c ? 'active' : ''}`}
                    onClick={() => setFilterCategory(c)}
                  >{c}</button>
                ))}
              </div>
            </div>

            {menuLoading && <p className="loading-text">Loading menu…</p>}

            {!menuLoading && visibleItems.length === 0 && (
              <p className="empty-state">No items available.</p>
            )}

            {!menuLoading && visibleItems.length > 0 && (
              <div className="menu-grid">
                {visibleItems.map((item) => (
                  <div className="menu-card" key={item.id}>
                    {item.imageUrl
                      ? <img src={getImageUrl(item.imageUrl)} alt={item.name} className="menu-card-img" />
                      : <div className="menu-card-img-placeholder" />}
                    <div className="menu-card-body">
                      <div className="menu-card-name">{item.name}</div>
                      {item.description && <p className="menu-card-desc">{item.description}</p>}
                      <div className="menu-card-footer">
                        <span className="menu-price">£{parseFloat(item.price).toFixed(2)}</span>
                        {cart[item.id] ? (
                          <div className="qty-control">
                            <button className="qty-btn" onClick={() => removeFromCart(item.id)}>-</button>
                            <span className="qty-val">{cart[item.id].quantity}</span>
                            <button className="qty-btn" onClick={() => addToCart(item)}>+</button>
                          </div>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Cart / Order side ── */}
          <aside className="cart-aside">
            <h2>Your Order</h2>

            {orderSuccess ? (
              <div className="success-box">
                <p>{orderSuccess}</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }}
                  onClick={() => navigate('/my-orders')}>View My Orders</button>
              </div>
            ) : (
              <>
                {cartLines.length === 0
                  ? <p className="empty-state" style={{ padding: '1rem 0' }}>Your cart is empty.</p>
                  : (
                    <div className="cart-lines">
                      {cartLines.map((l) => (
                        <div key={l.item.id} className="cart-line">
                          <div className="cart-line-name">
                            {l.item.name}
                            <span className="cart-line-qty"> x{l.quantity}</span>
                          </div>
                          <div className="cart-line-price">
                            £{(parseFloat(l.item.price) * l.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      <div className="cart-total">
                        <span>Total</span>
                        <strong>£{cartTotal.toFixed(2)}</strong>
                      </div>
                    </div>
                  )}

                <ErrorMessage error={orderError} />

                {!user && (
                  <p className="auth-switch" style={{ marginBottom: '0.75rem' }}>
                    <a href="/login">Sign in</a> to place an order.
                  </p>
                )}

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="delivery-address">Delivery address *</label>
                  <input
                    id="delivery-address"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); setOrderError([]); }}
                    placeholder="123 My Street, City"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="order-notes">Notes (optional)</label>
                  <textarea
                    id="order-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Allergies, special requests…"
                  />
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={handlePlaceOrder}
                  disabled={placing || cartLines.length === 0}
                >
                  {placing ? 'Placing order…' : `Place Order · £${cartTotal.toFixed(2)}`}
                </button>
              </>
            )}
          </aside>
        </div>

          {/* ─── Reviews Section ─── */}
          <div className="reviews-section">
            <h2 style={{ marginBottom: '0.75rem' }}>Ratings &amp; Reviews
              {selected.avgRating > 0 && (
                <span className="review-stats-badge" style={{ marginLeft: '0.75rem' }}>
                  {'★'.repeat(Math.round(selected.avgRating))}{'☆'.repeat(5 - Math.round(selected.avgRating))}
                  {' '}{parseFloat(selected.avgRating).toFixed(1)}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({selected.reviewCount} review{selected.reviewCount !== 1 ? 's' : ''})</span>
                </span>
              )}
            </h2>

            {user?.role === 'user' && (
              <form className="review-form" onSubmit={handleSubmitReview}>
                <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Leave a review</p>
                <div className="rating-input">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= (reviewHover || reviewRating) ? 'selected' : ''}`}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} stars`}
                    >★</button>
                  ))}
                </div>
                <div className="form-group">
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience (optional)…"
                  />
                </div>
                {reviewError && <p style={{ color: '#dc2626', fontSize: '0.83rem', marginBottom: '0.5rem' }}>{reviewError}</p>}
                {reviewSuccess && <p style={{ color: '#16a34a', fontSize: '0.83rem', marginBottom: '0.5rem' }}>{reviewSuccess}</p>}
                <button type="submit" className="btn btn-primary btn-sm" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}

            {reviews.length === 0
              ? <p className="empty-state" style={{ paddingTop: '0.75rem' }}>No reviews yet. Be the first!</p>
              : (
                <div className="reviews-list">
                  {reviews.map((rv) => (
                    <div key={rv.id} className="review-card">
                      <div className="review-header">
                        <span className="review-author">
                          {rv.customer?.username || 'Customer'}
                          {rv.isVerified && <span className="verified-badge">✓ Verified</span>}
                        </span>
                        <span className="review-date">
                          {'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}
                          {' · '}
                          {new Date(rv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {rv.comment && <p className="review-comment">{rv.comment}</p>}
                    </div>
                  ))}
                </div>
              )
            }
          </div>
      </div>
    );
  }

  // Restaurant list view
  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse Restaurants</h1>
      </div>

      <div className="filters">
        <input
          type="search" className="filter-input"
          placeholder="Search by name…" value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterCuisine}
          onChange={(e) => setFilterCuisine(e.target.value)}>
          <option value="">All cuisines</option>
          {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {fetchError && <ErrorMessage error={fetchError} />}
      {loading    && <p className="loading-text">Loading restaurants…</p>}

      {!loading && !fetchError && restaurants.length === 0 && (
        <p className="empty-state">No open restaurants found.</p>
      )}

      {!loading && !fetchError && restaurants.length > 0 && (
        <div className="card-grid">
          {restaurants.map((r) => (
            <button key={r.id} className="card card-clickable" onClick={() => openRestaurant(r)}>
              {r.imageUrl
                ? <img src={getImageUrl(r.imageUrl)} alt={r.name} className="card-img" />
                : <div className="card-img-placeholder">No image</div>}
              <div className="card-body">
                <div className="card-title-row">
                  <h3 className="card-title">{r.name}</h3>
                  <span className="badge badge-green">Open</span>
                </div>
                <p className="card-meta">{r.cuisine}</p>
                <p className="card-meta">{r.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
