import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import type { Item, BorrowRequest } from '../types/index.js';
import { useAuth } from '../hooks/useAuth.js';
import { ItemPlaceholderImage } from '../components/ItemPlaceholderImage.js';
import { RequestCard } from '../components/RequestCard.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  PackageOpen,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const MyListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') === 'requests' ? 'requests' : 'items';

  const [items, setItems] = useState<Item[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/my-listings' } });
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userItems, userIncoming] = await Promise.all([
        api.items.getAll({ owner_id: user?.id }),
        api.requests.getIncomingRequests(),
      ]);
      setItems(userItems);
      setIncomingRequests(userIncoming);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load your listings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      const updated = await api.requests.approve(requestId);
      setIncomingRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      // Also update local items state so the item is shown as unavailable
      setItems((prev) =>
        prev.map((item) => (item.id === updated.item_id ? { ...item, available: false } : item))
      );
      setNotification({
        type: 'success',
        message: 'Borrow request approved! The item is now marked as unavailable.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to approve request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      const updated = await api.requests.reject(requestId);
      setIncomingRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      setNotification({
        type: 'success',
        message: 'Borrow request rejected. The item remains available.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to reject request.' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteItem = (item: Item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setActionLoading(true);
      await api.items.delete(itemToDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setNotification({ type: 'success', message: 'Item listing deleted successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete listing.' });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Campus Listings & Requests
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage items you have listed and respond to student borrowing requests.
          </p>
        </div>

        <Link
          to="/create-listing"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          List New Item
        </Link>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-sm ml-2 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setSearchParams({ tab: 'items' })}
          className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>My Items</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] tabular-nums">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'requests' })}
          className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Incoming Requests</span>
          {pendingIncomingCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold tabular-nums">
              {pendingIncomingCount} pending
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] tabular-nums">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: My Items */}
      {activeTab === 'items' && (
        <>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading your listings...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-6">
              <PackageOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900">No items listed yet</h3>
              <p className="mt-1 text-xs text-slate-500">
                You haven't listed any items for campus borrowing yet. Share your textbooks, calculators, or lab tools!
              </p>
              <Link
                to="/create-listing"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                List Your First Item
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-4 justify-between"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                      <ItemPlaceholderImage
                        src={item.image_url}
                        alt={item.title}
                        category={item.category}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 font-medium">{item.category}</span>
                        <span className="text-slate-300">·</span>
                        {item.available ? (
                          <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Available
                          </span>
                        ) : (
                          <span className="text-amber-800 text-xs font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Borrowed
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        {item.condition} · Pickup: {item.pickup_location}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Duration: {item.borrow_duration}
                      </p>
                    </div>
                  </div>

                  {/* Actions: View, Edit, Delete */}
                  <div className="flex sm:flex-col justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <Link
                      to={`/items/${item.id}`}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      title="View details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View</span>
                    </Link>

                    <Link
                      to={`/edit-listing/${item.id}`}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      title="Edit item"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit</span>
                    </Link>

                    <button
                      onClick={() => confirmDeleteItem(item)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Incoming Borrow Requests */}
      {activeTab === 'requests' && (
        <>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading incoming requests...</p>
            </div>
          ) : incomingRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-6">
              <Inbox className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900">No incoming borrow requests</h3>
              <p className="mt-1 text-xs text-slate-500">
                When other students request to borrow your items, their requests will appear here for your review and approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  isOwnerView={true}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog for Item Deletion */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Item Listing"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete Listing"
        cancelLabel="Cancel"
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={actionLoading}
      />
    </div>
  );
};
