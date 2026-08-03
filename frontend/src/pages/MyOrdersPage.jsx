import { useState, useEffect } from 'react';
import { getMyOrders } from '../api/orders';
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

export default function MyOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getMyOrders()
      .then((r) => setOrders(r.data.orders))
      .catch(() => setError('Failed to load your orders.'))
      .finally(() => setLoading(false));
  }, []);

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
              <p className="order-notes">Note: {order.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
