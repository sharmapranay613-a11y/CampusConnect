import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.js';
import { MainLayout } from './layouts/MainLayout.js';

import { BrowsePage } from './pages/BrowsePage.js';
import { ItemDetailPage } from './pages/ItemDetailPage.js';
import { CreateListingPage } from './pages/CreateListingPage.js';
import { EditListingPage } from './pages/EditListingPage.js';
import { MyListingsPage } from './pages/MyListingsPage.js';
import { MyRequestsPage } from './pages/MyRequestsPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignUpPage } from './pages/SignUpPage.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<BrowsePage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/create-listing" element={<CreateListingPage />} />
            <Route path="/edit-listing/:id" element={<EditListingPage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/my-requests" element={<MyRequestsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
