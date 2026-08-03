import { useState, useEffect, useCallback } from 'react';
import { getOwnerOrders, updateOrderStatus } from '../api/orders';
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from '../api/restaurants';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../api/menuItems';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import ImagePreview from '../components/ImagePreview';

/* ── constants ───────────────────────────────────────────── */
const CUISINE_OPTIONS  = ['Italian','Chinese','Indian','Mexican','Japanese','American','Thai','Mediterranean','Other'];
const CATEGORY_OPTIONS = ['Starter','Main Course','Dessert','Drink','Side','Snack','Vegetarian','Vegan','Other'];
const STATUS_OPTIONS   = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'];

const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_CLASS = {
  pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-blue',
  out_for_delivery: 'badge-blue', delivered: 'badge-green', cancelled: 'badge-red',
};

const emptyRestaurantForm = { name: '', cuisine: '', address: '', phone: '', isOpen: true };
const emptyMenuForm       = { name: '', description: '', price: '', category: '', isAvailable: true, restaurantId: '' };

const validateRestaurant = ({ name, cuisine, address, phone }) => {
  const e = [];
  if (!name   || name.trim().length < 2)    e.push('Restaurant name must be at least 2 characters.');
  if (!cuisine || cuisine.trim().length < 2) e.push('Cuisine type is required.');
  if (!address || address.trim().length < 5) e.push('Address must be at least 5 characters.');
  if (phone && !/^[+\d\s\-().]{7,20}$/.test(phone)) e.push('Please enter a valid phone number.');
  return e;
};
const validateMenu = ({ name, price, category, restaurantId }) => {
  const e = [];
  if (!name     || name.trim().length < 2) e.push('Item name must be at least 2 characters.');
  if (!price    || isNaN(price) || parseFloat(price) <= 0) e.push('Price must be a positive number.');
  if (!category) e.push('Category is required.');
  if (!restaurantId) e.push('Please select a restaurant.');
  return e;
};

export default function OwnerPortalPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('orders'); // 'orders' | 'restaurants' | 'menu'

  /* ── Orders state ───────────────────────────────────────── */
  const [orders, setOrders]         = useState([]);
  const [ordersLoading, setOL]      = useState(true);
  const [ordersError, setOE]        = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setOL(true); setOE(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getOwnerOrders(params);
      setOrders(res.data.orders);
    } catch { setOE('Failed to load orders.'); }
    finally  { setOL(false); }
  }, [statusFilter]);

  useEffect(() => { if (tab === 'orders') fetchOrders(); }, [tab, fetchOrders]);

  const handleStatusChange = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? res.data.order : o));
    } catch { alert('Failed to update order status.'); }
    finally  { setUpdatingId(null); }
  };

  /* ── Restaurants state ──────────────────────────────────── */
  const [restaurants, setRestaurants]   = useState([]);
  const [rLoading, setRL]               = useState(true);
  const [rError, setRE]                 = useState(null);
  const [showRForm, setShowRForm]       = useState(false);
  const [editingR, setEditingR]         = useState(null);
  const [rForm, setRForm]               = useState(emptyRestaurantForm);
  const [rImageFile, setRImageFile]     = useState(null);
  const [rImagePreview, setRImagePreview] = useState(null);
  const [rFormErrors, setRFE]           = useState([]);
  const [rSubmitting, setRS]            = useState(false);
  const [deleteRTarget, setDeleteRTarget] = useState(null);

  const fetchMyRestaurants = useCallback(async () => {
    setRL(true); setRE(null);
    try {
      const res = await getRestaurants();
      setRestaurants(res.data.restaurants.filter((r) => r.ownerId === user.id));
    } catch { setRE('Failed to load restaurants.'); }
    finally  { setRL(false); }
  }, [user.id]);

  useEffect(() => { if (tab === 'restaurants') fetchMyRestaurants(); }, [tab, fetchMyRestaurants]);

  const openCreateR = () => { setEditingR(null); setRForm(emptyRestaurantForm); setRImageFile(null); setRImagePreview(null); setRFE([]); setShowRForm(true); };
  const openEditR   = (r)  => { setEditingR(r); setRForm({ name: r.name, cuisine: r.cuisine, address: r.address, phone: r.phone||'', isOpen: r.isOpen }); setRImageFile(null); setRImagePreview(r.imageUrl||null); setRFE([]); setShowRForm(true); };
  const closeRForm  = ()   => { setShowRForm(false); setEditingR(null); setRFE([]); setRImageFile(null); setRImagePreview(null); };

  const handleRImageChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setRFE(['Only JPG, PNG, WEBP allowed.']); return; }
    if (file.size > 5*1024*1024) { setRFE(['Image must be under 5MB.']); return; }
    setRImageFile(file); setRImagePreview(URL.createObjectURL(file));
  };

  const handleRSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRestaurant(rForm);
    if (errs.length) { setRFE(errs); return; }
    setRS(true);
    try {
      const fd = new FormData();
      ['name','cuisine','address','phone'].forEach((k) => fd.append(k, rForm[k].trim()));
      fd.append('isOpen', rForm.isOpen);
      if (rImageFile) fd.append('image', rImageFile);
      if (editingR) await updateRestaurant(editingR.id, fd);
      else          await createRestaurant(fd);
      closeRForm(); fetchMyRestaurants();
    } catch (err) {
      const d = err.response?.data?.details || err.response?.data?.error;
      setRFE(Array.isArray(d) ? d : [d || 'Failed to save.']);
    } finally { setRS(false); }
  };

  const handleDeleteR = async () => {
    if (!deleteRTarget) return;
    try { await deleteRestaurant(deleteRTarget.id); setDeleteRTarget(null); fetchMyRestaurants(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
  };

  /* ── Menu Items state ───────────────────────────────────── */
  const [menuItems, setMenuItems]       = useState([]);
  const [mLoading, setML]               = useState(true);
  const [mError, setME]                 = useState(null);
  const [showMForm, setShowMForm]       = useState(false);
  const [editingM, setEditingM]         = useState(null);
  const [mForm, setMForm]               = useState(emptyMenuForm);
  const [mImageFile, setMImageFile]     = useState(null);
  const [mImagePreview, setMImagePreview] = useState(null);
  const [mFormErrors, setMFE]           = useState([]);
  const [mSubmitting, setMS]            = useState(false);
  const [deleteMTarget, setDeleteMTarget] = useState(null);
  const [menuRestFilter, setMenuRestFilter] = useState('');

  const fetchMyMenuItems = useCallback(async () => {
    setML(true); setME(null);
    try {
      // fetch all my restaurants first if not loaded
      const rRes = await getRestaurants();
      const myIds = rRes.data.restaurants.filter((r) => r.ownerId === user.id).map((r) => r.id);
      if (!myIds.length) { setMenuItems([]); return; }
      // fetch items for all my restaurants
      const params = {};
      if (menuRestFilter) params.restaurantId = menuRestFilter;
      const res = await getMenuItems(params);
      const mine = res.data.items.filter((i) => myIds.includes(i.restaurantId));
      setMenuItems(mine);
    } catch { setME('Failed to load menu items.'); }
    finally  { setML(false); }
  }, [user.id, menuRestFilter]);

  useEffect(() => { if (tab === 'menu') fetchMyMenuItems(); }, [tab, fetchMyMenuItems]);

  const openCreateM = () => {
    setEditingM(null); setMForm({ ...emptyMenuForm, restaurantId: restaurants[0]?.id?.toString() || '' });
    setMImageFile(null); setMImagePreview(null); setMFE([]); setShowMForm(true);
  };
  const openEditM = (item) => {
    setEditingM(item);
    setMForm({ name: item.name, description: item.description||'', price: item.price, category: item.category, isAvailable: item.isAvailable, restaurantId: String(item.restaurantId) });
    setMImageFile(null); setMImagePreview(item.imageUrl||null); setMFE([]); setShowMForm(true);
  };
  const closeMForm = () => { setShowMForm(false); setEditingM(null); setMFE([]); setMImageFile(null); setMImagePreview(null); };

  const handleMImageChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setMFE(['Only JPG, PNG, WEBP allowed.']); return; }
    if (file.size > 5*1024*1024) { setMFE(['Image must be under 5MB.']); return; }
    setMImageFile(file); setMImagePreview(URL.createObjectURL(file));
  };

  const handleMSubmit = async (e) => {
    e.preventDefault();
    const errs = validateMenu(mForm);
    if (errs.length) { setMFE(errs); return; }
    setMS(true);
    try {
      const fd = new FormData();
      fd.append('name', mForm.name.trim()); fd.append('description', mForm.description.trim());
      fd.append('price', mForm.price); fd.append('category', mForm.category);
      fd.append('isAvailable', mForm.isAvailable); fd.append('restaurantId', mForm.restaurantId);
      if (mImageFile) fd.append('image', mImageFile);
      if (editingM) await updateMenuItem(editingM.id, fd);
      else          await createMenuItem(fd);
      closeMForm(); fetchMyMenuItems();
    } catch (err) {
      const d = err.response?.data?.details || err.response?.data?.error;
      setMFE(Array.isArray(d) ? d : [d || 'Failed to save.']);
    } finally { setMS(false); }
  };

  const handleDeleteM = async () => {
    if (!deleteMTarget) return;
    try { await deleteMenuItem(deleteMTarget.id); setDeleteMTarget(null); fetchMyMenuItems(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header"><h1>Owner Portal</h1></div>

      {/* Tab bar */}
      <div className="portal-tabs">
        {[['orders','Orders'],['restaurants','My Restaurants'],['menu','Menu Items']].map(([key,label]) => (
          <button key={key} className={`portal-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
            {key === 'orders' && orders.filter((o) => o.status === 'pending').length > 0 && (
              <span className="tab-badge">{orders.filter((o) => o.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Orders tab ── */}
      {tab === 'orders' && (
        <div>
          <div className="filters" style={{ marginBottom: '1rem' }}>
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={fetchOrders}>Refresh</button>
          </div>

          {ordersError && <ErrorMessage error={ordersError} />}
          {ordersLoading && <p className="loading-text">Loading orders…</p>}
          {!ordersLoading && !ordersError && orders.length === 0 && (
            <p className="empty-state">No orders yet.</p>
          )}

          <div className="order-list">
            {orders.map((order) => (
              <div key={order.id} className={`order-card ${order.status === 'pending' ? 'order-card-new' : ''}`}>
                <div className="order-card-header">
                  <div>
                    <span className="order-restaurant">{order.restaurant?.name}</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
                      })}
                    </span>
                    <span className="order-customer">Customer: {order.customer?.username}</span>
                  </div>
                  <span className={`badge ${STATUS_CLASS[order.status] || 'badge-yellow'}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                <div className="order-items-list">
                  {order.items?.map((line) => (
                    <div key={line.id} className="order-line">
                      <span>{line.itemName} <span className="order-line-qty">x{line.quantity}</span></span>
                      <span>£{(parseFloat(line.unitPrice) * line.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <span className="order-address">{order.deliveryAddress}</span>
                  <strong className="order-total">£{parseFloat(order.totalAmount).toFixed(2)}</strong>
                </div>

                {order.notes && <p className="order-notes">Note: {order.notes}</p>}

                {/* Status updater */}
                <div className="order-status-row">
                  <label htmlFor={`status-${order.id}`} className="order-status-label">Update status:</label>
                  <select
                    id={`status-${order.id}`}
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="filter-select"
                    style={{ minWidth: 'auto' }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  {updatingId === order.id && <span className="text-muted"> Saving…</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Restaurants tab ── */}
      {tab === 'restaurants' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={openCreateR}>+ Add Restaurant</button>
          </div>
          {rError   && <ErrorMessage error={rError} />}
          {rLoading && <p className="loading-text">Loading restaurants…</p>}
          {!rLoading && restaurants.length === 0 && <p className="empty-state">No restaurants yet.</p>}

          <div className="card-grid">
            {restaurants.map((r) => (
              <div className="card" key={r.id}>
                {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className="card-img" />
                  : <div className="card-img-placeholder">No image</div>}
                <div className="card-body">
                  <div className="card-title-row">
                    <h3 className="card-title">{r.name}</h3>
                    <span className={`badge ${r.isOpen ? 'badge-green' : 'badge-red'}`}>
                      {r.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="card-meta">{r.cuisine}</p>
                  <p className="card-meta">{r.address}</p>
                  {r.phone && <p className="card-meta">{r.phone}</p>}
                  <div className="card-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openEditR(r)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteRTarget(r)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showRForm && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="modal modal-large">
                <div className="modal-header">
                  <h2>{editingR ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
                  <button className="modal-close" onClick={closeRForm} aria-label="Close">✕</button>
                </div>
                <form onSubmit={handleRSubmit} noValidate>
                  <ErrorMessage error={rFormErrors} />
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input name="name" value={rForm.name} onChange={(e) => { setRForm((f)=>({...f,name:e.target.value})); setRFE([]); }} placeholder="Restaurant name" required />
                    </div>
                    <div className="form-group">
                      <label>Cuisine *</label>
                      <select value={rForm.cuisine} onChange={(e) => { setRForm((f)=>({...f,cuisine:e.target.value})); setRFE([]); }} required>
                        <option value="">Select cuisine…</option>
                        {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Address *</label>
                    <input value={rForm.address} onChange={(e) => { setRForm((f)=>({...f,address:e.target.value})); setRFE([]); }} placeholder="123 Main St" required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input value={rForm.phone} onChange={(e) => setRForm((f)=>({...f,phone:e.target.value}))} placeholder="+1 555 0100" />
                    </div>
                    <div className="form-group form-group-check">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={rForm.isOpen} onChange={(e) => setRForm((f)=>({...f,isOpen:e.target.checked}))} />
                        Currently Open
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Image (JPG/PNG/WEBP, max 5MB)</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleRImageChange} />
                    <ImagePreview src={rImagePreview} alt="Restaurant preview" />
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn btn-primary" disabled={rSubmitting}>
                      {rSubmitting ? 'Saving…' : editingR ? 'Save Changes' : 'Create Restaurant'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={closeRForm}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deleteRTarget && (
            <ConfirmDialog
              message={`Delete "${deleteRTarget.name}"? This will also remove all its menu items.`}
              onConfirm={handleDeleteR} onCancel={() => setDeleteRTarget(null)} />
          )}
        </div>
      )}

      {/* ── Menu Items tab ── */}
      {tab === 'menu' && (
        <div>
          <div className="filters" style={{ marginBottom: '1rem' }}>
            <select className="filter-select" value={menuRestFilter} onChange={(e) => setMenuRestFilter(e.target.value)}>
              <option value="">All my restaurants</option>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={openCreateM}>+ Add Item</button>
          </div>

          {mError   && <ErrorMessage error={mError} />}
          {mLoading && <p className="loading-text">Loading menu items…</p>}
          {!mLoading && menuItems.length === 0 && <p className="empty-state">No menu items yet.</p>}

          {!mLoading && menuItems.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Category</th><th>Price</th>
                    <th>Restaurant</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id} className={!item.isAvailable ? 'row-unavailable' : ''}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.description && <p className="item-desc">{item.description}</p>}
                      </td>
                      <td>{item.category}</td>
                      <td className="price-cell">£{parseFloat(item.price).toFixed(2)}</td>
                      <td>{item.restaurant?.name || '—'}</td>
                      <td>
                        <span className={`badge ${item.isAvailable ? 'badge-green' : 'badge-red'}`}>
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-sm btn-outline" onClick={() => openEditM(item)}>Edit</button>
                          <button className="btn btn-sm btn-danger"  onClick={() => setDeleteMTarget(item)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showMForm && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="modal modal-large">
                <div className="modal-header">
                  <h2>{editingM ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                  <button className="modal-close" onClick={closeMForm} aria-label="Close">✕</button>
                </div>
                <form onSubmit={handleMSubmit} noValidate>
                  <ErrorMessage error={mFormErrors} />
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input value={mForm.name} onChange={(e) => { setMForm((f)=>({...f,name:e.target.value})); setMFE([]); }} placeholder="e.g. Margherita Pizza" required />
                    </div>
                    <div className="form-group">
                      <label>Category *</label>
                      <select value={mForm.category} onChange={(e) => { setMForm((f)=>({...f,category:e.target.value})); setMFE([]); }} required>
                        <option value="">Select category…</option>
                        {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={mForm.description} onChange={(e) => setMForm((f)=>({...f,description:e.target.value}))} rows={2} placeholder="Optional description" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Price (£) *</label>
                      <input type="number" min="0.01" step="0.01" value={mForm.price}
                        onChange={(e) => { setMForm((f)=>({...f,price:e.target.value})); setMFE([]); }} placeholder="0.00" required />
                    </div>
                    <div className="form-group">
                      <label>Restaurant *</label>
                      <select value={mForm.restaurantId} onChange={(e) => { setMForm((f)=>({...f,restaurantId:e.target.value})); setMFE([]); }} required>
                        <option value="">Select restaurant…</option>
                        {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group form-group-check">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={mForm.isAvailable} onChange={(e) => setMForm((f)=>({...f,isAvailable:e.target.checked}))} />
                      Available for ordering
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Image (JPG/PNG/WEBP, max 5MB)</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleMImageChange} />
                    <ImagePreview src={mImagePreview} alt="Item preview" />
                  </div>
                  <div className="modal-actions">
                    <button type="submit" className="btn btn-primary" disabled={mSubmitting}>
                      {mSubmitting ? 'Saving…' : editingM ? 'Save Changes' : 'Add Item'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={closeMForm}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deleteMTarget && (
            <ConfirmDialog
              message={`Delete "${deleteMTarget.name}"?`}
              onConfirm={handleDeleteM} onCancel={() => setDeleteMTarget(null)} />
          )}
        </div>
      )}
    </div>
  );
}
