-- CampusConnect: Student-to-Student Campus Item Borrowing Database Schema
-- Run this in your Supabase SQL Editor to set up the PostgreSQL database, triggers & security policies

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  borrower_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
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

-- Drop existing policies to allow clean re-runs
DROP POLICY IF EXISTS "Public profiles are viewable by anyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view available items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can view all items" ON public.items;
DROP POLICY IF EXISTS "Users can insert their own items" ON public.items;
DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;

DROP POLICY IF EXISTS "Users can create borrow requests for themselves" ON public.borrow_requests;
DROP POLICY IF EXISTS "Borrowers can view their own requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Item owners can view requests for their items" ON public.borrow_requests;
DROP POLICY IF EXISTS "Only item owners can approve or reject requests" ON public.borrow_requests;

-- Profiles Policies
-- Both anonymous and authenticated users can view student profiles attached to items
CREATE POLICY "Public profiles are viewable by anyone"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Items Policies
-- Anyone (guests and authenticated students) can browse item listings
CREATE POLICY "Anyone can view available items"
  ON public.items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated students can list their own items
CREATE POLICY "Users can insert their own items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Only the owner can update their item listing
CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Only the owner can delete their item listing
CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Borrow Requests Policies
-- Authenticated students can request an item from another student
CREATE POLICY "Users can create borrow requests for themselves"
  ON public.borrow_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = borrower_id AND auth.uid() <> owner_id);

-- Borrowers can view their own sent requests
CREATE POLICY "Borrowers can view their own requests"
  ON public.borrow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = borrower_id);

-- Item owners can view incoming requests for their items
CREATE POLICY "Item owners can view requests for their items"
  ON public.borrow_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Only the item owner can approve or reject requests
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

DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_borrow_requests_updated_at ON public.borrow_requests;
CREATE TRIGGER update_borrow_requests_updated_at
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Automatic Profile Creation Trigger on User Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, department, year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'department', 'Computer Science & Engineering'),
    COALESCE(NEW.raw_user_meta_data->>'year', '3rd Year')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    department = EXCLUDED.department,
    year = EXCLUDED.year;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Explicit Grant Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 10. Storage bucket setup instructions:
-- In Supabase Dashboard -> Storage -> Create a new public bucket named: 'item-images'
-- Storage Policies:
-- 1. Give SELECT permission to public or authenticated users.
-- 2. Give INSERT/UPDATE permission to authenticated users.
