import type { Profile, Item, BorrowRequest } from '../types/index.js';
import { supabase, isSupabaseClientConfigured } from '../lib/supabase.js';

function getSupabaseClient() {
  if (!isSupabaseClientConfigured || !supabase) {
    throw new Error('Supabase client is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

export const api = {
  // --- Authentication ---
  auth: {
    async register(payload: {
      full_name: string;
      email: string;
      department: string;
      year: string;
      password: string;
    }): Promise<{ user: Profile; token: string; message: string }> {
      const client = getSupabaseClient();
      const email = payload.email.toLowerCase().trim();
      const fullName = payload.full_name.trim();
      const department = payload.department.trim();
      const year = payload.year.trim();

      const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password: payload.password,
        options: {
          data: {
            full_name: fullName,
            department,
            year,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('User creation failed. Please try again.');
      }

      const userProfile: Profile = {
        id: authData.user.id,
        full_name: fullName,
        email,
        department,
        year,
        created_at: authData.user.created_at || new Date().toISOString(),
      };

      // Ensure profile is inserted into public.profiles
      try {
        await client.from('profiles').upsert(userProfile);
      } catch (profileErr: any) {
        console.warn('Profile upsert notice:', profileErr?.message);
      }

      const token = authData.session?.access_token || authData.user.id;

      return {
        user: userProfile,
        token,
        message: authData.session
          ? 'Account created successfully.'
          : 'Account created! If email confirmation is enabled on your project, please check your inbox to confirm.',
      };
    },

    async login(payload: {
      email: string;
      password: string;
    }): Promise<{ user: Profile; token: string; message: string }> {
      const client = getSupabaseClient();
      const email = payload.email.toLowerCase().trim();

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password: payload.password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid college email or password.');
      }

      const token = authData.session?.access_token || authData.user.id;

      // Fetch user profile from database
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      let userProfile: Profile;
      if (profileData && !profileError) {
        userProfile = profileData as Profile;
      } else {
        // Fallback to auth metadata if profile row hasn't populated yet
        userProfile = {
          id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
          email,
          department: authData.user.user_metadata?.department || 'Computer Science',
          year: authData.user.user_metadata?.year || '1st Year',
          created_at: authData.user.created_at || new Date().toISOString(),
        };
        try {
          await client.from('profiles').upsert(userProfile);
        } catch {
          // Ignore
        }
      }

      return {
        user: userProfile,
        token,
        message: 'Logged in successfully.',
      };
    },

    async getProfile(providedUser?: any): Promise<{ user: Profile }> {
      const client = getSupabaseClient();
      let authUser = providedUser;

      if (!authUser) {
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError || !user) {
          throw new Error('Unauthorized');
        }
        authUser = user;
      }

      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileData && !profileError) {
        return { user: profileData as Profile };
      }

      const fallbackProfile: Profile = {
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Student',
        email: authUser.email || '',
        department: authUser.user_metadata?.department || 'General',
        year: authUser.user_metadata?.year || 'Student',
        created_at: authUser.created_at || new Date().toISOString(),
      };

      try {
        await client.from('profiles').upsert(fallbackProfile);
      } catch (err: any) {
        console.warn('[CampusConnect] Profile upsert notice:', err?.message || err);
      }

      return { user: fallbackProfile };
    },

    async logout(): Promise<void> {
      if (isSupabaseClientConfigured && supabase) {
        await supabase.auth.signOut();
      }
    },
  },

  // --- Items Management (Single Source of Truth: Supabase public.items) ---
  items: {
    async getAll(params?: { search?: string; category?: string; owner_id?: string }): Promise<Item[]> {
      const client = getSupabaseClient();

      let query = client
        .from('items')
        .select('*, profiles:owner_id(id, full_name, email, department, year)')
        .order('created_at', { ascending: false });

      if (params?.category && params.category !== 'All') {
        query = query.eq('category', params.category);
      }
      if (params?.owner_id) {
        query = query.eq('owner_id', params.owner_id);
      }

      let { data, error } = await query;

      // Resilient fallback: if relational foreign key join errors, load items directly and enrich profiles
      if (error) {
        console.warn('[CampusConnect] Relational items join failed, using direct query fallback:', error.message);
        let fallbackQuery = client
          .from('items')
          .select('*')
          .order('created_at', { ascending: false });

        if (params?.category && params.category !== 'All') {
          fallbackQuery = fallbackQuery.eq('category', params.category);
        }
        if (params?.owner_id) {
          fallbackQuery = fallbackQuery.eq('owner_id', params.owner_id);
        }

        const fallbackRes = await fallbackQuery;
        if (fallbackRes.error) {
          console.error('[CampusConnect] Direct items query also failed:', fallbackRes.error);
          throw new Error(`Failed to load items from database: ${fallbackRes.error.message}`);
        }

        data = fallbackRes.data || [];

        // Enrich items with profiles if available
        if (data && data.length > 0) {
          const ownerIds = [...new Set(data.map((d: any) => d.owner_id).filter(Boolean))];
          if (ownerIds.length > 0) {
            try {
              const { data: profilesData } = await client
                .from('profiles')
                .select('id, full_name, email, department, year')
                .in('id', ownerIds);

              const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
              data = data.map((d: any) => ({
                ...d,
                profiles: profileMap.get(d.owner_id),
              }));
            } catch (pErr) {
              console.warn('[CampusConnect] Could not enrich profiles in fallback:', pErr);
            }
          }
        }
      }

      console.info(`[CampusConnect] items.getAll loaded ${data?.length || 0} items from Supabase.`);

      let items = (data || []).map((d: any) => ({
        ...d,
        owner: d.profiles || undefined,
      })) as Item[];

      if (params?.search) {
        const q = params.search.toLowerCase().trim();
        items = items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.pickup_location.toLowerCase().includes(q) ||
            i.owner?.full_name?.toLowerCase().includes(q)
        );
      }

      return items;
    },

    async getById(id: string): Promise<Item> {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('items')
        .select('*, profiles:owner_id(id, full_name, email, department, year)')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Listing not found in database.');
      }

      return {
        ...data,
        owner: data.profiles || undefined,
      } as Item;
    },

    async create(itemData: {
      title: string;
      description: string;
      category: string;
      condition: string;
      image_url: string;
      pickup_location: string;
      borrow_duration: string;
    }): Promise<Item> {
      const client = getSupabaseClient();

      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to create an item listing.');
      }

      // Ensure owner profile exists in public.profiles to satisfy foreign key constraint
      const { data: existingProfile } = await client
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        await client.from('profiles').upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
          email: user.email || '',
          department: user.user_metadata?.department || 'Engineering',
          year: user.user_metadata?.year || '1st Year',
          created_at: user.created_at || new Date().toISOString(),
        });
      }

      const { data, error } = await client
        .from('items')
        .insert({
          owner_id: user.id,
          title: itemData.title.trim(),
          description: itemData.description.trim(),
          category: itemData.category.trim(),
          condition: itemData.condition.trim(),
          image_url: itemData.image_url?.trim() || '',
          pickup_location: itemData.pickup_location.trim(),
          borrow_duration: itemData.borrow_duration.trim(),
          available: true,
        })
        .select('*, profiles:owner_id(id, full_name, email, department, year)')
        .single();

      if (error || !data) {
        throw new Error(`Failed to save item to database: ${error?.message || 'Unknown database error'}`);
      }

      return {
        ...data,
        owner: data.profiles || undefined,
      } as Item;
    },

    async update(
      id: string,
      itemData: Partial<{
        title: string;
        description: string;
        category: string;
        condition: string;
        image_url: string;
        pickup_location: string;
        borrow_duration: string;
        available: boolean;
      }>
    ): Promise<Item> {
      const client = getSupabaseClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized');

      const { data, error } = await client
        .from('items')
        .update({
          ...itemData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select('*, profiles:owner_id(id, full_name, email, department, year)')
        .single();

      if (error || !data) {
        throw new Error(`Failed to update item: ${error?.message || 'Database error'}`);
      }

      return {
        ...data,
        owner: data.profiles || undefined,
      } as Item;
    },

    async delete(id: string): Promise<void> {
      const client = getSupabaseClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized');

      const { error } = await client
        .from('items')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) {
        throw new Error(`Failed to delete item: ${error.message}`);
      }
    },
  },

  // --- Borrow Requests (Single Source of Truth: Supabase public.borrow_requests) ---
  requests: {
    async create(itemId: string, borrowerPhone?: string): Promise<BorrowRequest> {
      const client = getSupabaseClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to request an item.');
      }

      const item = await api.items.getById(itemId);
      if (!item) {
        throw new Error('Item not found.');
      }
      if (!item.available) {
        throw new Error('This item is currently unavailable.');
      }
      if (item.owner_id === user.id) {
        throw new Error('You cannot request to borrow your own item.');
      }

      const phone = borrowerPhone?.trim() || '';

      // Ensure borrower profile exists
      const { data: existingProfile } = await client
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        await client.from('profiles').upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
          email: user.email || '',
          department: user.user_metadata?.department || 'General',
          year: user.user_metadata?.year || 'Student',
          created_at: user.created_at || new Date().toISOString(),
        });
      }

      const { data, error } = await client
        .from('borrow_requests')
        .insert({
          item_id: itemId,
          borrower_id: user.id,
          owner_id: item.owner_id,
          borrower_phone: phone,
          status: 'pending',
        })
        .select('*, item:items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
        .single();

      if (error || !data) {
        throw new Error(`Failed to create borrow request: ${error?.message || 'Database error'}`);
      }

      return {
        ...data,
        borrower_phone: data.borrower_phone,
        phone_number: data.borrower_phone,
        item: data.item,
        borrower: data.borrower,
        owner: data.owner,
      } as BorrowRequest;
    },

    async getMyRequests(): Promise<BorrowRequest[]> {
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return [];

      const { data, error } = await client
        .from('borrow_requests')
        .select('*, item:items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
        .eq('borrower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch my requests: ${error.message}`);
      }

      return (data || []).map((d: any) => ({
        ...d,
        borrower_phone: d.borrower_phone,
        phone_number: d.borrower_phone,
        item: d.item,
        borrower: d.borrower,
        owner: d.owner,
      })) as BorrowRequest[];
    },

    async getIncomingRequests(): Promise<BorrowRequest[]> {
      const client = getSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return [];

      const { data, error } = await client
        .from('borrow_requests')
        .select('*, item:items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch incoming requests: ${error.message}`);
      }

      return (data || []).map((d: any) => ({
        ...d,
        borrower_phone: d.borrower_phone,
        phone_number: d.borrower_phone,
        item: d.item,
        borrower: d.borrower,
        owner: d.owner,
      })) as BorrowRequest[];
    },

    async updateStatus(requestId: string, status: 'approved' | 'rejected'): Promise<BorrowRequest> {
      const client = getSupabaseClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized');

      const { data, error } = await client
        .from('borrow_requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('owner_id', user.id)
        .select('*, item:items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
        .single();

      if (error || !data) {
        throw new Error(`Failed to update request status: ${error?.message || 'Database error'}`);
      }

      // If approved, update item availability
      if (status === 'approved') {
        await client
          .from('items')
          .update({ available: false, updated_at: new Date().toISOString() })
          .eq('id', data.item_id);
      }

      return {
        ...data,
        borrower_phone: data.borrower_phone,
        phone_number: data.borrower_phone,
        item: data.item,
        borrower: data.borrower,
        owner: data.owner,
      } as BorrowRequest;
    },

    async approve(requestId: string): Promise<BorrowRequest> {
      return this.updateStatus(requestId, 'approved');
    },

    async reject(requestId: string): Promise<BorrowRequest> {
      return this.updateStatus(requestId, 'rejected');
    },
  },

  // --- Image Storage ---
  async uploadImage(file: File): Promise<string> {
    if (isSupabaseClientConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${user?.id || 'anon'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(fileName);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Supabase storage upload notice, using image compressor:', err);
      }
    }

    // High-performance client-side image compressor & reader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },
};
