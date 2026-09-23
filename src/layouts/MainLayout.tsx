import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar.js';
import { CampusConnectLogo } from '../components/CampusConnectLogo.js';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:opacity-90 transition-opacity">
              <CampusConnectLogo className="h-5 w-5" />
            </Link>
            <span>· College Student Borrowing System</span>
          </div>
          <p>© {new Date().getFullYear()} CampusConnect</p>
        </div>
      </footer>
    </div>
  );
};
