import { useState, useEffect, useCallback } from 'react';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../api/menuItems';
import { getRestaurants } from '../api/restaurants';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import ImagePreview from '../components/ImagePreview';
import { getImageUrl } from '../api/client';

const CATEGORY_OPTIONS = ['Starter', 'Main Course', 'Dessert', 'Drink', 'Side', 'Snack', 'Vegetarian', 'Vegan', 'Other'];

const emptyForm = { name: '', description: '', price: '', category: '', isAvailable: true, restaurantId: '' };

const validate = ({ name, price, category, restaurantId }) => {
  const errs = [];
  if (!name || name.trim().length < 2) errs.push('Item name must be at least 2 characters.');
  if (!price) errs.push('Price is required.');
  else if (isNaN(price) || parseFloat(price) <= 0) errs.push('Price must be a positive number.');
  if (!category) errs.push('Category is required.');
  if (!restaurantId) errs.push('Please select a restaurant.');
  return errs;
};

export default function MenuItemsPage() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState('');
  const [filterAvailable, setFilterAvailable] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      if (filterRestaurant) params.restaurantId = filterRestaurant;
      if (filterAvailable !== '') params.isAvailable = filterAvailable;
      const res = await getMenuItems(params);
      setItems(res.data.items);
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterRestaurant, filterAvailable]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Load restaurants for the form dropdown (only user's own)
  useEffect(() => {
    if (!user) return;
    getRestaurants()
      .then((res) => setRestaurants(res.data.restaurants))
      .catch(() => {});
  }, [user]);

  const myRestaurants = restaurants.filter(
    (r) => user && (r.ownerId === user.id || user.role === 'admin')
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setFormErrors([]);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      isAvailable: item.isAvailable,
      restaurantId: String(item.restaurantId),
    });
    setImageFile(null);
    setImagePreview(item.imageUrl || null);
    setFormErrors([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormErrors([]);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setFormErrors([]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFormErrors(['Only JPG, PNG, and WEBP images are allowed.']);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(['Image must be under 5MB.']);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    if (clientErrors.length) {
      setFormErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('description', form.description.trim());
      fd.append('price', form.price);
      fd.append('category', form.category);
      fd.append('isAvailable', form.isAvailable);
      fd.append('restaurantId', form.restaurantId);
      if (imageFile) fd.append('image', imageFile);

      if (editing) {
        await updateMenuItem(editing.id, fd);
      } else {
        await createMenuItem(fd);
      }
      closeForm();
      fetchItems();
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data?.error;
      setFormErrors(Array.isArray(detail) ? detail : [detail || 'Failed to save menu item.']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMenuItem(deleteTarget.id);
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item.');
    }
  };

  const canModify = (item) =>
    user && (user.id === item.restaurant?.ownerId || user.role === 'admin');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Menu Items</h1>
        {user && myRestaurants.length > 0 && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Item
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-input"
        />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="filter-select">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterRestaurant} onChange={(e) => setFilterRestaurant(e.target.value)} className="filter-select">
          <option value="">All restaurants</option>
          {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={filterAvailable} onChange={(e) => setFilterAvailable(e.target.value)} className="filter-select">
          <option value="">Any availability</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>
      </div>

      {fetchError && <ErrorMessage error={fetchError} />}
      {loading && <p className="loading-text">Loading menu items…</p>}

      {!loading && !fetchError && (
        <>
          {items.length === 0 ? (
            <p className="empty-state">No menu items found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Restaurant</th>
                    <th>Status</th>
                    {user && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={!item.isAvailable ? 'row-unavailable' : ''}>
                      <td>
                        {item.imageUrl ? (
                          <img src={getImageUrl(item.imageUrl)} alt={item.name} className="table-img" />
                        ) : (
                          <span className="table-img-placeholder">—</span>
                        )}
                      </td>
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
                      {user && (
                        <td>
                          {canModify(item) ? (
                            <div className="table-actions">
                              <button className="btn btn-sm btn-outline" onClick={() => openEdit(item)}>Edit</button>
                              <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(item)}>Delete</button>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>{editing ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button className="modal-close" onClick={closeForm} aria-label="Close">✕</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <ErrorMessage error={formErrors} />

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mi-name">Name *</label>
                  <input id="mi-name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Margherita Pizza" required />
                </div>
                <div className="form-group">
                  <label htmlFor="mi-category">Category *</label>
                  <select id="mi-category" name="category" value={form.category} onChange={handleChange} required>
                    <option value="">Select category…</option>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="mi-description">Description</label>
                <textarea id="mi-description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Optional description" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mi-price">Price (£) *</label>
                  <input id="mi-price" name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label htmlFor="mi-restaurant">Restaurant *</label>
                  <select id="mi-restaurant" name="restaurantId" value={form.restaurantId} onChange={handleChange} required>
                    <option value="">Select restaurant…</option>
                    {myRestaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group form-group-check">
                <label className="checkbox-label">
                  <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleChange} />
                  Available for ordering
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="mi-image">Image (JPG/PNG/WEBP, max 5MB)</label>
                <input id="mi-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
                <ImagePreview src={imagePreview} alt="Item preview" />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
                </button>
                <button type="button" className="btn btn-outline" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
