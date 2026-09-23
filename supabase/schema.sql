-- CampusConnect: Student-to-Student Campus Item Borrowing Database Schema
-- Run this in the Supabase SQL Editor to set up PostgreSQL database & security policies

-- 1. Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  image_url TEXT,
  pickup_location TEXT NOT NULL,
  borrow_duration TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create borrow_requests table
CREATE TABLE IF NOT EXISTS public.borrow_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON public.items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_available ON public.items(available);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_borrower ON public.borrow_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_owner ON public.borrow_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_item ON public.borrow_requests(item_id);

-- Prevent duplicate pending requests for the same item by the same borrower
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
ON public.borrow_requests(item_id, borrower_id) 
WHERE status = 'pending';

-- 6. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Items Policies
CREATE POLICY "Authenticated users can view all items"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Borrow Requests Policies
CREATE POLICY "Users can create borrow requests for themselves"
  ON public.borrow_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = borrower_id AND auth.uid() <> owner_id);

CREATE POLICY "Borrowers can view their own requests"
  ON public.borrow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = borrower_id);

CREATE POLICY "Item owners can view requests for their items"
  ON public.borrow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Only item owners can approve or reject requests"
  ON public.borrow_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 7. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_borrow_requests_updated_at
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Storage bucket setup instructions:
-- In Supabase Dashboard -> Storage -> Create a new public bucket named: 'item-images'
-- Storage Policies:
-- 1. Give SELECT permission to public or authenticated users.
-- 2. Give INSERT/UPDATE permission to authenticated users.
