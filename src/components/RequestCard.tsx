import React from 'react';
import type { BorrowRequest } from '../types/index.js';
import { ItemPlaceholderImage } from './ItemPlaceholderImage.js';
import { Check, X, Calendar, User, Clock, AlertCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  request: BorrowRequest;
  isOwnerView?: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  actionLoading?: boolean;
}

export const RequestCard: React.FC<Props> = ({
  request,
  isOwnerView = false,
  onAccept,
  onReject,
  actionLoading = false,
}) => {
  const item = request.item;
  const formattedDate = new Date(request.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getStatusBadge = () => {
    switch (request.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Item & Student Info */}
        <div className="flex items-start gap-4">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
            <ItemPlaceholderImage
              src={item?.image_url}
              alt={item?.title || 'Borrowed Item'}
              category={item?.category}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge()}
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {formattedDate}
              </span>
            </div>

            <Link
              to={item ? `/items/${item.id}` : '#'}
              className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
            >
              {item?.title || 'Campus Item'}
            </Link>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              {isOwnerView ? (
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Borrower:</span>
                  <span className="font-semibold text-slate-800">
                    {request.borrower?.full_name || 'Student'}
                  </span>
                  <span className="text-slate-400">({request.borrower?.department} · {request.borrower?.year})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Owner:</span>
                  <span className="font-semibold text-slate-800">
                    {request.owner?.full_name || item?.owner?.full_name || 'Student'}
                  </span>
                </div>
              )}
            </div>

            {item && (
              <div className="mt-1 text-xs text-slate-500">
                <span>Pickup: {item.pickup_location}</span>
                <span className="mx-1.5 text-slate-300">|</span>
                <span>Duration: {item.borrow_duration}</span>
              </div>
            )}

            {/* Borrower Contact Phone */}
            {(request.borrower_phone || request.phone_number) && (
              <div className="mt-2.5 flex items-center gap-2 text-xs">
                {isOwnerView ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-900 font-medium">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-slate-500">Borrower Phone:</span>
                    <a
                      href={`tel:${request.borrower_phone || request.phone_number}`}
                      className="font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
                    >
                      {request.borrower_phone || request.phone_number}
                    </a>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Your Phone:</span>
                    <span className="font-semibold text-slate-800">
                      {request.borrower_phone || request.phone_number}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls for Owner */}
        {isOwnerView && request.status === 'pending' && onAccept && onReject && (
          <div className="w-full sm:w-auto flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
            <button
              onClick={() => onReject(request.id)}
              disabled={actionLoading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5 text-rose-500" />
              Reject
            </button>
            <button
              onClick={() => onAccept(request.id)}
              disabled={actionLoading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
          </div>
        )}

        {/* Status notice when already handled */}
        {request.status !== 'pending' && (
          <div className="text-xs text-slate-500 sm:text-right shrink-0">
            {request.status === 'approved' ? (
              <p className="text-emerald-700 font-medium">Borrow confirmed. Contact student for handover.</p>
            ) : (
              <p className="text-slate-400">Request declined.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
