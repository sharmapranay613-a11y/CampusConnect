import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import type { Item, BorrowRequest } from '../types/index.js';
import { useAuth } from '../hooks/useAuth.js';
import { ItemPlaceholderImage } from '../components/ItemPlaceholderImage.js';
import {
  MapPin,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<BorrowRequest | null>(null);

  useEffect(() => {
    if (id) {
      fetchItemDetails(id);
    }
  }, [id]);

  const fetchItemDetails = async (itemId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.items.getById(itemId);
      setItem(data);

      // Check if user has an existing request for this item
      if (user) {
        try {
          const myRequests = await api.requests.getMyRequests();
          const found = myRequests.find((r) => r.item_id === itemId);
          if (found) {
            setExistingRequest(found);
          }
        } catch (e) {
          // Non-blocking
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowRequest = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/items/${id}` } });
      return;
    }
    if (!item) return;

    try {
      setRequesting(true);
      setRequestError(null);
      const res = await api.requests.create(item.id);
      setExistingRequest(res);
      setRequestSuccess('Borrow request submitted! The owner has been notified.');
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit borrow request.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Item Not Found</h2>
        <p className="mt-1 text-sm text-slate-600">{error || 'This listing does not exist or has been removed.'}</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Browse Items
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === item.owner_id;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all items
      </Link>

      {/* Main PDP Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Left Column: Large Image (5 or 6 cols) */}
        <div className="md:col-span-6 bg-slate-100 relative min-h-[300px] sm:min-h-[420px] flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200/80">
          <ItemPlaceholderImage
            src={item.image_url}
            alt={item.title}
            category={item.category}
            className="w-full h-full object-cover max-h-[500px]"
          />

          {/* Availability Badge */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs">
            {item.available ? (
              <span className="text-emerald-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Available to Borrow
              </span>
            ) : (
              <span className="text-amber-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Currently Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Contiguous Purchase / Borrow Module (6 or 7 cols) */}
        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Category & Condition */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-semibold text-indigo-600 uppercase tracking-wide">
                {item.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-600">Condition: {item.condition}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              {item.title}
            </h1>

            {/* Description */}
            <div className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Key Item Specs / Terms */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max Borrow Duration</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{item.borrow_duration}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pickup Location</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                  {item.pickup_location}
                </p>
              </div>
            </div>

            {/* Owner Profile Card */}
            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {item.owner?.full_name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Listed by campus student</p>
                  <p className="text-sm font-semibold text-slate-900">{item.owner?.full_name || 'Student Owner'}</p>
                  <p className="text-xs text-slate-500">
                    {item.owner?.department} {item.owner?.year ? `· ${item.owner.year}` : ''}
                  </p>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
            </div>
          </div>

          {/* Action Zone / Borrow Trigger */}
          <div className="mt-8 pt-5 border-t border-slate-100 space-y-3">
            {requestSuccess && (
              <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{requestSuccess}</span>
              </div>
            )}

            {requestError && (
              <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            {isOwner ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-800">You listed this item</p>
                  <p className="text-xs text-slate-500">You cannot borrow your own listing.</p>
                </div>
                <Link
                  to={`/edit-listing/${item.id}`}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 shadow-xs"
                >
                  Edit Listing
                </Link>
              </div>
            ) : !item.available ? (
              <div className="w-full py-3.5 px-4 bg-slate-100 text-slate-500 font-semibold text-sm rounded-xl text-center border border-slate-200 cursor-not-allowed select-none">
                Currently Unavailable (Already Borrowed)
              </div>
            ) : existingRequest && existingRequest.status === 'pending' ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">Borrow Request Pending</p>
                    <p className="text-amber-700">Waiting for {item.owner?.full_name} to accept.</p>
                  </div>
                </div>
                <Link
                  to="/my-requests"
                  className="px-3.5 py-1.5 bg-white text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100 shrink-0"
                >
                  View My Requests
                </Link>
              </div>
            ) : existingRequest && existingRequest.status === 'approved' ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">Your Request Was Approved!</p>
                    <p className="text-emerald-700">Contact owner to pick up at {item.pickup_location}.</p>
                  </div>
                </div>
                <Link
                  to="/my-requests"
                  className="px-3.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 shrink-0"
                >
                  My Requests
                </Link>
              </div>
            ) : (
              <button
                onClick={handleBorrowRequest}
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {requesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Request to Borrow</span>
                  </>
                )}
              </button>
            )}

            {!user && (
              <p className="text-center text-xs text-slate-500 pt-1">
                You will be prompted to log in before submitting a borrow request.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
