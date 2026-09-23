import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import type { BorrowRequest } from '../types/index.js';
import { useAuth } from '../hooks/useAuth.js';
import { RequestCard } from '../components/RequestCard.js';
import { Inbox, Loader2, PackageOpen } from 'lucide-react';

export const MyRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/my-requests' } });
      return;
    }
    fetchMyRequests();
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.requests.getMyRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your borrow requests.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Borrow Requests
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Track the status of campus items you requested from other students.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
              filter === status
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            {status} ({status === 'all' ? requests.length : requests.filter((r) => r.status === status).length})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Loading your requests...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium border border-rose-200">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-6">
          <PackageOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No requests found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {filter === 'all'
              ? 'You have not requested to borrow any campus items yet.'
              : `You have no ${filter} requests.`}
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Browse Available Items
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard key={req.id} request={req} isOwnerView={false} />
          ))}
        </div>
      )}
    </div>
  );
};
