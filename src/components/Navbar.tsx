import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Menu, X, Plus, LogOut, ArrowRightLeft } from 'lucide-react';
import { CampusConnectLogo } from './CampusConnectLogo.js';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitch = async (role: 'alex' | 'bella') => {
    try {
      setIsSwitching(true);
      await switchDemoUser(role);
      setMobileMenuOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-95"
              aria-label="CampusConnect Home"
            >
              <CampusConnectLogo className="h-9 w-9" />
              <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center">
                <span className="text-slate-900">CAMPUS</span>
                <span className="text-blue-600 ml-1">CONNECT</span>
              </span>
            </Link>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors pb-0.5 ${
                isActive('/')
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Browse Items
            </Link>
            {user && (
              <>
                <Link
                  to="/my-listings"
                  className={`transition-colors pb-0.5 ${
                    isActive('/my-listings')
                      ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Listings
                </Link>
                <Link
                  to="/my-requests"
                  className={`transition-colors pb-0.5 ${
                    isActive('/my-requests')
                      ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Requests
                </Link>
              </>
            )}
          </nav>

          {/* Zone 3: Primary Actions & User Info */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/create-listing"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  List Item
                </Link>

                <div className="h-4 w-px bg-slate-200" />

                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1 max-w-[140px]">
                    {user.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {user.department}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                to="/create-listing"
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Create Listing"
              >
                <Plus className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Browse Items
            </Link>
            {user && (
              <>
                <Link
                  to="/my-listings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive('/my-listings') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  My Listings
                </Link>
                <Link
                  to="/my-requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive('/my-requests') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  My Requests
                </Link>
                <Link
                  to="/create-listing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  List a New Item
                </Link>
              </>
            )}
          </nav>

          {user ? (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="px-3">
                <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email} · {user.department} ({user.year})</p>
              </div>

              {/* Quick demo switch on mobile */}
              <div className="px-3 py-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 font-medium mb-1.5">Switch Demo Student:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQuickSwitch('alex')}
                    className={`flex-1 py-1 text-xs rounded border text-center font-medium ${
                      user.email.includes('alex') ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Student A (Alex)
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('bella')}
                    className={`flex-1 py-1 text-xs rounded border text-center font-medium ${
                      user.email.includes('bella') ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Student B (Bella)
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
