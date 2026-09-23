import type { Profile, Item, BorrowRequest } from '../types/index.js';
import { supabase, isSupabaseClientConfigured } from '../lib/supabase.js';

// Initial Campus Seed Data for seamless instant loading and offline/initial resilience
const SEED_PROFILES: Profile[] = [
  {
    id: 'std-a-uuid-1111',
    full_name: 'Alex Rivera (Student A)',
    email: 'alex.rivera@campus.edu',
    department: 'Computer Science',
    year: '3rd Year',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'std-b-uuid-2222',
    full_name: 'Bella Chen (Student B)',
    email: 'bella.chen@campus.edu',
    department: 'Electrical Engineering',
    year: '2nd Year',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const SEED_PASSWORDS: Record<string, string> = {
  'alex.rivera@campus.edu': 'password123',
  'bella.chen@campus.edu': 'password123',
};

const SEED_ITEMS: Item[] = [
  {
    id: 'item-calc-001',
    owner_id: 'std-a-uuid-1111',
    title: 'Casio FX-991EX ClassWiz Scientific Calculator',
    description: 'Ideal for semester exams, engineering mathematics, and matrix calculations. Comes with protective snap-on cover.',
    category: 'Calculators & Electronics',
    condition: 'Like New',
    image_url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    pickup_location: 'Central Library, 2nd Floor Quiet Study Area',
    borrow_duration: '1 week',
    available: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    owner: {
      id: 'std-a-uuid-1111',
      full_name: 'Alex Rivera (Student A)',
      email: 'alex.rivera@campus.edu',
      department: 'Computer Science',
      year: '3rd Year',
    },
  },
  {
    id: 'item-book-002',
    owner_id: 'std-b-uuid-2222',
    title: 'Introduction to Algorithms (CLRS 3rd Edition)',
    description: 'Standard textbook for Data Structures and Algorithms. Clean pages with no ink markings.',
    category: 'Textbooks',
    condition: 'Good',
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    pickup_location: 'CS Department Block B, Near Lab 4',
    borrow_duration: '2 weeks',
    available: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    owner: {
      id: 'std-b-uuid-2222',
      full_name: 'Bella Chen (Student B)',
      email: 'bella.chen@campus.edu',
      department: 'Electrical Engineering',
      year: '2nd Year',
    },
  },
  {
    id: 'item-draft-003',
    owner_id: 'std-a-uuid-1111',
    title: 'Engineering Mini Drafter & Drawing Sheet Container',
    description: 'Complete with scale ruler clamp, protractor, and cylindrical carrying case. Essential for engineering graphics semester practicals.',
    category: 'Drafting & Tools',
    condition: 'Good',
    image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
    pickup_location: 'Hostel 3 Common Room / Mechanical Workshop',
    borrow_duration: '3 days',
    available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner: {
      id: 'std-a-uuid-1111',
      full_name: 'Alex Rivera (Student A)',
      email: 'alex.rivera@campus.edu',
      department: 'Computer Science',
      year: '3rd Year',
    },
  },
];

// Helper functions for persistent local store
const STORAGE_KEYS = {
  PROFILES: 'campusconnect_profiles',
  PASSWORDS: 'campusconnect_passwords',
  ITEMS: 'campusconnect_items',
  REQUESTS: 'campusconnect_requests',
  CURRENT_USER: 'campusconnect_current_user',
};

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage setItem warning:', e);
  }
}

// Initialize default data if empty
function initializeStore(): void {
  const profiles = getStored<Profile[]>(STORAGE_KEYS.PROFILES, []);
  if (!profiles || profiles.length === 0) {
    setStored(STORAGE_KEYS.PROFILES, SEED_PROFILES);
  }

  const passwords = getStored<Record<string, string>>(STORAGE_KEYS.PASSWORDS, {});
  if (!passwords || Object.keys(passwords).length === 0) {
    setStored(STORAGE_KEYS.PASSWORDS, SEED_PASSWORDS);
  }

  const items = getStored<Item[]>(STORAGE_KEYS.ITEMS, []);
  if (!items || items.length === 0) {
    setStored(STORAGE_KEYS.ITEMS, SEED_ITEMS);
  }
}

initializeStore();

function getLocalProfiles(): Profile[] {
  return getStored<Profile[]>(STORAGE_KEYS.PROFILES, SEED_PROFILES);
}

function getLocalProfileById(id: string): Profile | null {
  const profiles = getLocalProfiles();
  return profiles.find((p) => p.id === id) || null;
}

function saveLocalProfile(profile: Profile, password?: string): void {
  const profiles = getLocalProfiles();
  const existingIdx = profiles.findIndex((p) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase());
  if (existingIdx >= 0) {
    profiles[existingIdx] = { ...profiles[existingIdx], ...profile };
  } else {
    profiles.push(profile);
  }
  setStored(STORAGE_KEYS.PROFILES, profiles);

  if (password) {
    const passwords = getStored<Record<string, string>>(STORAGE_KEYS.PASSWORDS, SEED_PASSWORDS);
    passwords[profile.email.toLowerCase()] = password;
    setStored(STORAGE_KEYS.PASSWORDS, passwords);
  }
}

function getLocalItems(): Item[] {
  const items = getStored<Item[]>(STORAGE_KEYS.ITEMS, SEED_ITEMS);
  // Ensure each item has its owner attached
  return items.map((item) => {
    if (!item.owner) {
      const owner = getLocalProfileById(item.owner_id);
      if (owner) {
        return {
          ...item,
          owner: {
            id: owner.id,
            full_name: owner.full_name,
            email: owner.email,
            department: owner.department,
            year: owner.year,
          },
        };
      }
    }
    return item;
  });
}

function saveLocalItem(item: Item): void {
  const items = getLocalItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.unshift(item);
  }
  setStored(STORAGE_KEYS.ITEMS, items);
}

function deleteLocalItem(id: string): void {
  const items = getLocalItems().filter((i) => i.id !== id);
  setStored(STORAGE_KEYS.ITEMS, items);

  const requests = getLocalRequests().filter((r) => r.item_id !== id);
  setStored(STORAGE_KEYS.REQUESTS, requests);
}

function getLocalRequests(): BorrowRequest[] {
  return getStored<BorrowRequest[]>(STORAGE_KEYS.REQUESTS, []);
}

function saveLocalRequest(req: BorrowRequest): void {
  const requests = getLocalRequests();
  const idx = requests.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    requests[idx] = req;
  } else {
    requests.unshift(req);
  }
  setStored(STORAGE_KEYS.REQUESTS, requests);
}

function getCurrentUser(): Profile | null {
  return getStored<Profile | null>(STORAGE_KEYS.CURRENT_USER, null);
}

function setCurrentUser(user: Profile | null, token: string | null): void {
  if (user) {
    setStored(STORAGE_KEYS.CURRENT_USER, user);
    if (token) localStorage.setItem('campusconnect_token', token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem('campusconnect_token');
  }
}

// Core API Service: Communicates directly with Supabase, with automatic client-side resilience
export const api = {
  // --- Authentication & Profiles ---
  auth: {
    async register(payload: {
      full_name: string;
      email: string;
      department: string;
      year: string;
      password: string;
    }): Promise<{ user: Profile; token: string; message: string }> {
      const email = payload.email.toLowerCase().trim();
      let userId = crypto.randomUUID ? crypto.randomUUID() : `std-${Date.now()}`;
      let token = userId;

      // 1. Try Supabase Auth
      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: payload.password,
            options: {
              data: {
                full_name: payload.full_name.trim(),
                department: payload.department.trim(),
                year: payload.year.trim(),
              },
            },
          });

          if (!authError && authData.user) {
            userId = authData.user.id;
            token = authData.session?.access_token || authData.user.id;
          }
        } catch (e: any) {
          console.warn('Supabase auth signup notice (using local sync):', e.message);
        }
      }

      const profile: Profile = {
        id: userId,
        full_name: payload.full_name.trim(),
        email,
        department: payload.department.trim(),
        year: payload.year.trim(),
        created_at: new Date().toISOString(),
      };

      // 2. Try inserting profile into Supabase profiles table
      if (isSupabaseClientConfigured && supabase) {
        try {
          await supabase.from('profiles').upsert(profile);
        } catch (e: any) {
          console.warn('Supabase profiles upsert notice:', e.message);
        }
      }

      saveLocalProfile(profile, payload.password);
      setCurrentUser(profile, token);

      return {
        user: profile,
        token,
        message: 'Account created successfully.',
      };
    },

    async login(payload: {
      email: string;
      password: string;
    }): Promise<{ user: Profile; token: string; message: string }> {
      const email = payload.email.toLowerCase().trim();
      let userProfile: Profile | null = null;
      let token: string | null = null;

      // 1. Try Supabase Auth
      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password: payload.password,
          });

          if (!authError && authData.user) {
            token = authData.session?.access_token || authData.user.id;

            // Fetch profile
            const { data: pData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (pData) {
              userProfile = pData as Profile;
            } else {
              userProfile = {
                id: authData.user.id,
                full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
                email,
                department: authData.user.user_metadata?.department || 'General',
                year: authData.user.user_metadata?.year || 'Student',
                created_at: authData.user.created_at || new Date().toISOString(),
              };
            }
          }
        } catch (e: any) {
          console.warn('Supabase signInWithPassword fallback:', e.message);
        }
      }

      // 2. Local fallback if Supabase auth was not hit or user is demo/offline
      if (!userProfile) {
        const passwords = getStored<Record<string, string>>(STORAGE_KEYS.PASSWORDS, SEED_PASSWORDS);
        const storedPw = passwords[email];
        if (storedPw && storedPw === payload.password) {
          const profiles = getLocalProfiles();
          const match = profiles.find((p) => p.email.toLowerCase() === email);
          if (match) {
            userProfile = match;
            token = match.id;
          }
        }
      }

      if (!userProfile || !token) {
        throw new Error('Invalid college email or password.');
      }

      saveLocalProfile(userProfile);
      setCurrentUser(userProfile, token);

      return {
        user: userProfile,
        token,
        message: 'Logged in successfully.',
      };
    },

    async getProfile(): Promise<{ user: Profile }> {
      // 1. Check Supabase session
      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const { data: pData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionData.session.user.id)
              .maybeSingle();

            if (pData) {
              saveLocalProfile(pData as Profile);
              setCurrentUser(pData as Profile, sessionData.session.access_token);
              return { user: pData as Profile };
            }
          }
        } catch (e) {
          console.warn('Supabase getProfile session check notice:', e);
        }
      }

      // 2. Local stored user
      const current = getCurrentUser();
      if (current) {
        return { user: current };
      }

      // 3. Check token against local profiles
      const token = localStorage.getItem('campusconnect_token');
      if (token) {
        const profile = getLocalProfileById(token);
        if (profile) {
          setCurrentUser(profile, token);
          return { user: profile };
        }
      }

      throw new Error('Unauthorized');
    },
  },

  // --- Items Management ---
  items: {
    async getAll(params?: { search?: string; category?: string; owner_id?: string }): Promise<Item[]> {
      let items: Item[] = [];

      // Try Supabase directly from frontend
      if (isSupabaseClientConfigured && supabase) {
        try {
          let query = supabase
            .from('items')
            .select('*, profiles:owner_id(id, full_name, email, department, year)')
            .order('created_at', { ascending: false });

          if (params?.category && params.category !== 'All') {
            query = query.eq('category', params.category);
          }
          if (params?.owner_id) {
            query = query.eq('owner_id', params.owner_id);
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            items = data.map((d: any) => ({
              ...d,
              owner: d.profiles || getLocalProfileById(d.owner_id) || undefined,
            }));
            // Update local cache
            items.forEach((it) => saveLocalItem(it));
          }
        } catch (e) {
          console.warn('Supabase items query fallback to local cache:', e);
        }
      }

      // If Supabase returned no items or table not yet configured, use local items store
      if (items.length === 0) {
        items = getLocalItems();
      }

      // Apply client-side filters
      let result = items;
      if (params?.owner_id) {
        result = result.filter((i) => i.owner_id === params.owner_id);
      }
      if (params?.category && params.category !== 'All') {
        result = result.filter((i) => i.category.toLowerCase() === params.category!.toLowerCase());
      }
      if (params?.search) {
        const q = params.search.toLowerCase().trim();
        result = result.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.pickup_location.toLowerCase().includes(q)
        );
      }

      return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async getById(id: string): Promise<Item> {
      // 1. Try Supabase
      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*, profiles:owner_id(id, full_name, email, department, year)')
            .eq('id', id)
            .maybeSingle();

          if (!error && data) {
            const item: Item = {
              ...data,
              owner: data.profiles || getLocalProfileById(data.owner_id) || undefined,
            };
            saveLocalItem(item);
            return item;
          }
        } catch (e) {
          console.warn('Supabase getById fallback to local:', e);
        }
      }

      // 2. Local store
      const localItem = getLocalItems().find((i) => i.id === id);
      if (localItem) {
        return localItem;
      }

      throw new Error('Listing not found.');
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
      const user = getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to list an item.');
      }

      const id = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`;
      const now = new Date().toISOString();

      const newItem: Item = {
        id,
        owner_id: user.id,
        title: itemData.title.trim(),
        description: itemData.description.trim(),
        category: itemData.category.trim(),
        condition: itemData.condition.trim(),
        image_url: itemData.image_url?.trim() || '',
        pickup_location: itemData.pickup_location.trim(),
        borrow_duration: itemData.borrow_duration.trim(),
        available: true,
        created_at: now,
        updated_at: now,
        owner: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          department: user.department,
          year: user.year,
        },
      };

      // 1. Try Supabase
      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('items')
            .insert({
              id: newItem.id,
              owner_id: newItem.owner_id,
              title: newItem.title,
              description: newItem.description,
              category: newItem.category,
              condition: newItem.condition,
              image_url: newItem.image_url,
              pickup_location: newItem.pickup_location,
              borrow_duration: newItem.borrow_duration,
              available: newItem.available,
              created_at: newItem.created_at,
              updated_at: newItem.updated_at,
            })
            .select()
            .single();

          if (!error && data) {
            newItem.id = data.id;
          }
        } catch (e) {
          console.warn('Supabase create item fallback to local:', e);
        }
      }

      saveLocalItem(newItem);
      return newItem;
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
      const user = getCurrentUser();
      const existing = await api.items.getById(id);
      if (!existing) throw new Error('Item not found.');
      if (user && existing.owner_id !== user.id) {
        throw new Error('Only the item owner can modify this listing.');
      }

      const updated: Item = {
        ...existing,
        ...itemData,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseClientConfigured && supabase) {
        try {
          await supabase
            .from('items')
            .update({ ...itemData, updated_at: updated.updated_at })
            .eq('id', id);
        } catch (e) {
          console.warn('Supabase update item fallback:', e);
        }
      }

      saveLocalItem(updated);
      return updated;
    },

    async delete(id: string): Promise<void> {
      const user = getCurrentUser();
      const existing = await api.items.getById(id);
      if (user && existing.owner_id !== user.id) {
        throw new Error('Only the item owner can delete this listing.');
      }

      if (isSupabaseClientConfigured && supabase) {
        try {
          await supabase.from('items').delete().eq('id', id);
        } catch (e) {
          console.warn('Supabase delete item fallback:', e);
        }
      }

      deleteLocalItem(id);
    },
  },

  // --- Borrow Requests & Phone Number Coordination ---
  requests: {
    async create(itemId: string, borrowerPhone?: string): Promise<BorrowRequest> {
      const user = getCurrentUser();
      if (!user) {
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

      const id = crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`;
      const now = new Date().toISOString();

      const newRequest: BorrowRequest = {
        id,
        item_id: itemId,
        borrower_id: user.id,
        owner_id: item.owner_id,
        borrower_phone: phone,
        phone_number: phone,
        status: 'pending',
        created_at: now,
        updated_at: now,
        item,
        borrower: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          department: user.department,
          year: user.year,
        },
        owner: item.owner,
      };

      // 1. Try Supabase directly
      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('borrow_requests')
            .insert({
              id: newRequest.id,
              item_id: newRequest.item_id,
              borrower_id: newRequest.borrower_id,
              owner_id: newRequest.owner_id,
              borrower_phone: phone,
              status: 'pending',
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (!error && data) {
            newRequest.id = data.id;
          }
        } catch (e) {
          console.warn('Supabase create borrow_request fallback to local:', e);
        }
      }

      saveLocalRequest(newRequest);
      return newRequest;
    },

    async getMyRequests(): Promise<BorrowRequest[]> {
      const user = getCurrentUser();
      if (!user) return [];

      let list: BorrowRequest[] = [];

      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('borrow_requests')
            .select('*, item:items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
            .eq('borrower_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            list = data.map((d: any) => ({
              ...d,
              borrower_phone: d.borrower_phone || d.phone_number,
              phone_number: d.borrower_phone || d.phone_number,
              item: d.item,
              borrower: d.borrower,
              owner: d.owner,
            }));
            list.forEach((r) => saveLocalRequest(r));
          }
        } catch (e) {
          console.warn('Supabase getMyRequests fallback to local store:', e);
        }
      }

      if (list.length === 0) {
        list = getLocalRequests().filter((r) => r.borrower_id === user.id);
      }

      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async getIncomingRequests(): Promise<BorrowRequest[]> {
      const user = getCurrentUser();
      if (!user) return [];

      let list: BorrowRequest[] = [];

      if (isSupabaseClientConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('borrow_requests')
            .select('*, item:items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            list = data.map((d: any) => ({
              ...d,
              borrower_phone: d.borrower_phone || d.phone_number,
              phone_number: d.borrower_phone || d.phone_number,
              item: d.item,
              borrower: d.borrower,
              owner: d.owner,
            }));
            list.forEach((r) => saveLocalRequest(r));
          }
        } catch (e) {
          console.warn('Supabase getIncomingRequests fallback to local store:', e);
        }
      }

      if (list.length === 0) {
        list = getLocalRequests().filter((r) => r.owner_id === user.id);
      }

      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    async approve(requestId: string): Promise<BorrowRequest> {
      const requests = getLocalRequests();
      const req = requests.find((r) => r.id === requestId);
      if (!req) throw new Error('Borrow request not found.');

      req.status = 'approved';
      req.updated_at = new Date().toISOString();

      // 1. Try Supabase
      if (isSupabaseClientConfigured && supabase) {
        try {
          await supabase
            .from('borrow_requests')
            .update({ status: 'approved', updated_at: req.updated_at })
            .eq('id', requestId);

          await supabase
            .from('items')
            .update({ available: false, updated_at: req.updated_at })
            .eq('id', req.item_id);
        } catch (e) {
          console.warn('Supabase approve request notice:', e);
        }
      }

      // 2. Update local state
      saveLocalRequest(req);
      const item = getLocalItems().find((i) => i.id === req.item_id);
      if (item) {
        item.available = false;
        item.updated_at = req.updated_at;
        saveLocalItem(item);
      }

      return req;
    },

    async reject(requestId: string): Promise<BorrowRequest> {
      const requests = getLocalRequests();
      const req = requests.find((r) => r.id === requestId);
      if (!req) throw new Error('Borrow request not found.');

      req.status = 'rejected';
      req.updated_at = new Date().toISOString();

      // 1. Try Supabase
      if (isSupabaseClientConfigured && supabase) {
        try {
          await supabase
            .from('borrow_requests')
            .update({ status: 'rejected', updated_at: req.updated_at })
            .eq('id', requestId);
        } catch (e) {
          console.warn('Supabase reject request notice:', e);
        }
      }

      saveLocalRequest(req);
      return req;
    },
  },

  // --- Image Storage ---
  async uploadImage(file: File): Promise<string> {
    // 1. Try Supabase Storage bucket 'item-images'
    if (isSupabaseClientConfigured && supabase) {
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const filePath = `items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Supabase storage upload notice, utilizing client image compressor:', err);
      }
    }

    // 2. High-performance client-side image compressor & reader
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
