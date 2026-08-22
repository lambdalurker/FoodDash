import { useState, useEffect, useCallback } from 'react';
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from '../api/restaurants';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmDialog from '../components/ConfirmDialog';
import ImagePreview from '../components/ImagePreview';
import { getImageUrl } from '../api/client';

const CUISINE_OPTIONS = ['Italian', 'Chinese', 'Indian', 'Mexican', 'Japanese', 'American', 'Thai', 'Mediterranean', 'Other'];

const emptyForm = { name: '', cuisine: '', address: '', phone: '', isOpen: true };

const validate = ({ name, cuisine, address, phone }) => {
  const errs = [];
  if (!name || name.trim().length < 2) errs.push('Restaurant name must be at least 2 characters.');
  if (!cuisine || cuisine.trim().length < 2) errs.push('Cuisine type is required.');
  if (!address || address.trim().length < 5) errs.push('Address must be at least 5 characters.');
  if (phone && !/^[+\d\s\-().]{7,20}$/.test(phone)) errs.push('Please enter a valid phone number.');
  return errs;
};

export default function RestaurantsPage() {
  const { user } = useAuth();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Search/filter state
  const [search, setSearch] = useState('');
  const [filterCuisine, setFilterCuisine] = useState('');
  const [filterOpen, setFilterOpen] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // restaurant object or null
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterCuisine) params.cuisine = filterCuisine;
      if (filterOpen !== '') params.isOpen = filterOpen;
      const res = await getRestaurants(params);
      setRestaurants(res.data.restaurants);
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to load restaurants.');
    } finally {
      setLoading(false);
    }
  }, [search, filterCuisine, filterOpen]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setFormErrors([]);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, cuisine: r.cuisine, address: r.address, phone: r.phone || '', isOpen: r.isOpen });
    setImageFile(null);
    setImagePreview(r.imageUrl ? r.imageUrl : null);
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
      fd.append('cuisine', form.cuisine.trim());
      fd.append('address', form.address.trim());
      fd.append('phone', form.phone.trim());
      fd.append('isOpen', form.isOpen);
      if (imageFile) fd.append('image', imageFile);

      if (editing) {
        await updateRestaurant(editing.id, fd);
      } else {
        await createRestaurant(fd);
      }
      closeForm();
      fetchRestaurants();
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data?.error;
      setFormErrors(Array.isArray(detail) ? detail : [detail || 'Failed to save restaurant.']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRestaurant(deleteTarget.id);
      setDeleteTarget(null);
      fetchRestaurants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete restaurant.');
    }
  };

  const canModify = (r) => user && (user.id === r.ownerId || user.role === 'admin');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Restaurants</h1>
        {user && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Restaurant
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="filters">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-input"
        />
        <select value={filterCuisine} onChange={(e) => setFilterCuisine(e.target.value)} className="filter-select">
          <option value="">All cuisines</option>
          {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterOpen} onChange={(e) => setFilterOpen(e.target.value)} className="filter-select">
          <option value="">Any status</option>
          <option value="true">Open</option>
          <option value="false">Closed</option>
        </select>
      </div>

      {/* Error */}
      {fetchError && <ErrorMessage error={fetchError} />}

      {/* Loading */}
      {loading && <p className="loading-text">Loading restaurants…</p>}

      {/* Grid */}
      {!loading && !fetchError && (
        <>
          {restaurants.length === 0 ? (
            <p className="empty-state">No restaurants found. {user && 'Add the first one!'}</p>
          ) : (
            <div className="card-grid">
              {restaurants.map((r) => (
                <div className="card" key={r.id}>
                  {r.imageUrl ? (
                    <img src={getImageUrl(r.imageUrl)} alt={r.name} className="card-img" />
                  ) : (
                    <div className="card-img-placeholder">No image</div>
                  )}
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
                    <p className="card-owner">Owner: {r.owner?.username || '—'}</p>

                    {canModify(r) && (
                      <div className="card-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(r)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>{editing ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
              <button className="modal-close" onClick={closeForm} aria-label="Close">✕</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <ErrorMessage error={formErrors} />

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="r-name">Name *</label>
                  <input id="r-name" name="name" value={form.name} onChange={handleChange} placeholder="Restaurant name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="r-cuisine">Cuisine *</label>
                  <select id="r-cuisine" name="cuisine" value={form.cuisine} onChange={handleChange} required>
                    <option value="">Select cuisine…</option>
                    {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="r-address">Address *</label>
                <input id="r-address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main St" required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="r-phone">Phone</label>
                  <input id="r-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 0100" />
                </div>
                <div className="form-group form-group-check">
                  <label className="checkbox-label">
                    <input type="checkbox" name="isOpen" checked={form.isOpen} onChange={handleChange} />
                    Currently Open
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="r-image">Image (JPG/PNG/WEBP, max 5MB)</label>
                <input id="r-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
                <ImagePreview src={imagePreview} alt="Restaurant preview" />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Restaurant'}
                </button>
                <button type="button" className="btn btn-outline" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"? This will also remove all its menu items.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
