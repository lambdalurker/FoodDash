import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrders, cancelOrder } from '../api/orders';
import ErrorMessage from '../components/ErrorMessage';

const STATUS_LABEL = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  preparing:        'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
};

const STATUS_CLASS = {
  pending:          'badge-yellow',
  confirmed:        'badge-blue',
  preparing:        'badge-blue',
  out_for_delivery: 'badge-blue',
  delivered:        'badge-green',
  cancelled:        'badge-red',
};

const STEPS = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STEP_LABELS = ['Placed', 'Confirmed', 'Preparing', 'On the Way', 'Delivered'];

function OrderTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="tracker-cancelled">
        <span className="dot-red"></span> Order Cancelled
      </div>
    );
  }
  const currentIndex = STEPS.indexOf(status);
  return (
    <div className="order-tracker">
      {STEPS.map((step, idx) => {
        const isCompleted = idx <= currentIndex;
        const isActive = idx === currentIndex;
        return (
          <div key={step} className={`tracker-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
            <div className="tracker-bubble">
              {isCompleted ? '✓' : idx + 1}
            </div>
            <div className="tracker-label">{STEP_LABELS[idx]}</div>
            {idx < STEPS.length - 1 && <div className="tracker-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getMyOrders()
      .then((r) => setOrders(r.data.orders))
      .catch(() => setError('Failed to load your orders.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(orderId);
      // Refresh list
      const r = await getMyOrders();
      setOrders(r.data.orders);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel order.');
    }
  };

  const handleReorder = (order) => {
    localStorage.setItem('fooddash_reorder_restaurant_id', order.restaurantId);
    localStorage.setItem('fooddash_reorder_items', JSON.stringify(order.items.map(item => ({
      id: item.menuItemId,
      quantity: item.quantity
    }))));
    navigate('/browse');
  };

  if (loading) return <p className="loading-text">Loading your orders…</p>;
  if (error)   return <div className="page"><ErrorMessage error={error} /></div>;

  return (
    <div className="page">
      <div className="page-header"><h1>My Orders</h1></div>

      {orders.length === 0 && (
        <p className="empty-state">You haven't placed any orders yet.</p>
      )}

      <div className="order-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-card-header">
              <div>
                <span className="order-restaurant">{order.restaurant?.name}</span>
                <span className="order-date">
                  {new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <span className={`badge ${STATUS_CLASS[order.status] || 'badge-yellow'}`}>
                {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>

            {/* Visual Tracking steps bar */}
            <OrderTracker status={order.status} />

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
              <strong className="order-total">Total: £{parseFloat(order.totalAmount).toFixed(2)}</strong>
            </div>

            {order.notes && (
              <p className="order-notes" style={{ margin: '0.4rem 0 0 0' }}>Note: {order.notes}</p>
            )}

            {/* Action buttons */}
            <div className="order-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              {order.status === 'pending' && (
                <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleCancel(order.id)}>
                  Cancel Order
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => handleReorder(order)}>
                Reorder Items
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
