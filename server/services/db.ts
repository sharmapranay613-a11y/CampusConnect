import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import type { Profile, Item, BorrowRequest, RequestStatus } from '../../src/types/index.js';
import crypto from 'crypto';

// In-memory / file resilient database store for demo and local development
// Initializes with realistic campus items and student profiles for instant demo testing
const initialProfiles: Map<string, Profile> = new Map([
  [
    'std-a-uuid-1111',
    {
      id: 'std-a-uuid-1111',
      full_name: 'Alex Rivera (Student A)',
      email: 'alex.rivera@campus.edu',
      department: 'Computer Science',
      year: '3rd Year',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  [
    'std-b-uuid-2222',
    {
      id: 'std-b-uuid-2222',
      full_name: 'Bella Chen (Student B)',
      email: 'bella.chen@campus.edu',
      department: 'Electrical Engineering',
      year: '2nd Year',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
]);

const initialPasswords: Map<string, string> = new Map([
  ['alex.rivera@campus.edu', 'password123'],
  ['bella.chen@campus.edu', 'password123'],
]);

const initialItems: Map<string, Item> = new Map([
  [
    'item-calc-001',
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
    },
  ],
  [
    'item-book-002',
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
    },
  ],
  [
    'item-draft-003',
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
    },
  ],
]);

const initialRequests: Map<string, BorrowRequest> = new Map();

class DatabaseService {
  private profiles = initialProfiles;
  private passwords = initialPasswords;
  private items = initialItems;
  private requests = initialRequests;

  // --- Auth / Profile Methods ---
  async getProfileById(id: string): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (!error && data) return data as Profile;
      } catch (e) {
        console.warn('Supabase profile fetch error, using local fallback:', e);
      }
    }
    return this.profiles.get(id) || null;
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const normalized = email.toLowerCase().trim();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('email', normalized).maybeSingle();
        if (!error && data) return data as Profile;
      } catch (e) {
        console.warn('Supabase profile fetch by email error, using fallback:', e);
      }
    }
    for (const p of this.profiles.values()) {
      if (p.email.toLowerCase().trim() === normalized) return p;
    }
    return null;
  }

  async verifyPassword(email: string, password: string): Promise<Profile | null> {
    const normalized = email.toLowerCase().trim();
    const stored = this.passwords.get(normalized);
    if (stored && stored === password) {
      return this.getProfileByEmail(normalized);
    }
    return null;
  }

  async createProfile(data: {
    id?: string;
    full_name: string;
    email: string;
    department: string;
    year: string;
    password?: string;
  }): Promise<Profile> {
    const id = data.id || crypto.randomUUID();
    const normalizedEmail = data.email.toLowerCase().trim();
    const profile: Profile = {
      id,
      full_name: data.full_name.trim(),
      email: normalizedEmail,
      department: data.department.trim(),
      year: data.year.trim(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted, error } = await supabase.from('profiles').insert(profile).select().single();
        if (!error && inserted) {
          this.profiles.set(id, inserted as Profile);
          return inserted as Profile;
        }
      } catch (e) {
        console.warn('Supabase create profile error, falling back:', e);
      }
    }

    this.profiles.set(id, profile);
    if (data.password) {
      this.passwords.set(normalizedEmail, data.password);
    }
    return profile;
  }

  // --- Items Methods ---
  async getItems(options?: {
    search?: string;
    category?: string;
    owner_id?: string;
    availableOnly?: boolean;
  }): Promise<Item[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('items').select('*, profiles:owner_id(id, full_name, email, department, year)').order('created_at', { ascending: false });
        if (options?.category && options.category !== 'All') {
          query = query.eq('category', options.category);
        }
        if (options?.owner_id) {
          query = query.eq('owner_id', options.owner_id);
        }
        if (options?.availableOnly) {
          query = query.eq('available', true);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data.map((d: any) => ({
            ...d,
            owner: d.profiles,
          })) as Item[];
        }
      } catch (e) {
        console.warn('Supabase items query error, using local fallback:', e);
      }
    }

    // Local filter
    let list = Array.from(this.items.values()).map(item => {
      const owner = this.profiles.get(item.owner_id);
      return {
        ...item,
        owner: owner
          ? {
              id: owner.id,
              full_name: owner.full_name,
              email: owner.email,
              department: owner.department,
              year: owner.year,
            }
          : undefined,
      };
    });

    if (options?.owner_id) {
      list = list.filter(i => i.owner_id === options.owner_id);
    }

    if (options?.category && options.category !== 'All') {
      list = list.filter(i => i.category.toLowerCase() === options.category!.toLowerCase());
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.pickup_location.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  async getItemById(id: string): Promise<Item | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*, profiles:owner_id(id, full_name, email, department, year)')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) {
          return {
            ...data,
            owner: data.profiles,
          } as Item;
        }
      } catch (e) {
        console.warn('Supabase getItemById error, using local fallback:', e);
      }
    }

    const item = this.items.get(id);
    if (!item) return null;
    const owner = this.profiles.get(item.owner_id);
    return {
      ...item,
      owner: owner
        ? {
            id: owner.id,
            full_name: owner.full_name,
            email: owner.email,
            department: owner.department,
            year: owner.year,
          }
        : undefined,
    };
  }

  async createItem(data: {
    owner_id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    image_url: string;
    pickup_location: string;
    borrow_duration: string;
  }): Promise<Item> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newItem: Item = {
      id,
      owner_id: data.owner_id,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category.trim(),
      condition: data.condition.trim(),
      image_url: data.image_url?.trim() || '',
      pickup_location: data.pickup_location.trim(),
      borrow_duration: data.borrow_duration.trim(),
      available: true,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted, error } = await supabase.from('items').insert(newItem).select().single();
        if (!error && inserted) {
          this.items.set(id, inserted as Item);
          return inserted as Item;
        }
      } catch (e) {
        console.warn('Supabase insert item error, using local fallback:', e);
      }
    }

    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(
    id: string,
    owner_id: string,
    updates: Partial<Pick<Item, 'title' | 'description' | 'category' | 'condition' | 'image_url' | 'pickup_location' | 'borrow_duration' | 'available'>>
  ): Promise<Item | null> {
    const existing = await this.getItemById(id);
    if (!existing) return null;
    if (existing.owner_id !== owner_id) {
      throw new Error('Forbidden: Only the item owner can modify this listing.');
    }

    const updated: Item = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .update({ ...updates, updated_at: updated.updated_at })
          .eq('id', id)
          .eq('owner_id', owner_id)
          .select()
          .single();
        if (!error && data) {
          this.items.set(id, data as Item);
          return data as Item;
        }
      } catch (e) {
        console.warn('Supabase update item error, using local fallback:', e);
      }
    }

    this.items.set(id, updated);
    return updated;
  }

  async setItemAvailability(id: string, available: boolean): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.available = available;
      item.updated_at = new Date().toISOString();
      this.items.set(id, item);
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('items').update({ available, updated_at: new Date().toISOString() }).eq('id', id);
      } catch (e) {
        console.warn('Supabase setItemAvailability error:', e);
      }
    }
  }

  async deleteItem(id: string, owner_id: string): Promise<boolean> {
    const existing = await this.getItemById(id);
    if (!existing) return false;
    if (existing.owner_id !== owner_id) {
      throw new Error('Forbidden: Only the item owner can delete this listing.');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('items').delete().eq('id', id).eq('owner_id', owner_id);
        if (!error) {
          this.items.delete(id);
          return true;
        }
      } catch (e) {
        console.warn('Supabase delete item error, using local fallback:', e);
      }
    }

    this.items.delete(id);
    // Also remove requests associated with this item
    for (const [reqId, req] of this.requests.entries()) {
      if (req.item_id === id) {
        this.requests.delete(reqId);
      }
    }
    return true;
  }

  // --- Borrow Request Methods ---
  async createBorrowRequest(data: {
    item_id: string;
    borrower_id: string;
  }): Promise<BorrowRequest> {
    const item = await this.getItemById(data.item_id);
    if (!item) {
      throw new Error('Item not found.');
    }
    if (!item.available) {
      throw new Error('This item is currently unavailable.');
    }
    if (item.owner_id === data.borrower_id) {
      throw new Error('You cannot request to borrow your own item.');
    }

    // Check for duplicate pending requests
    const existingPending = await this.getPendingRequest(data.item_id, data.borrower_id);
    if (existingPending) {
      throw new Error('You already have a pending borrow request for this item.');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newRequest: BorrowRequest = {
      id,
      item_id: data.item_id,
      borrower_id: data.borrower_id,
      owner_id: item.owner_id,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted, error } = await supabase.from('borrow_requests').insert(newRequest).select().single();
        if (!error && inserted) {
          this.requests.set(id, inserted as BorrowRequest);
          return this.attachRequestRelations(inserted as BorrowRequest);
        }
      } catch (e) {
        console.warn('Supabase insert borrow request error, using local fallback:', e);
      }
    }

    this.requests.set(id, newRequest);
    return this.attachRequestRelations(newRequest);
  }

  async getPendingRequest(item_id: string, borrower_id: string): Promise<BorrowRequest | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('borrow_requests')
          .select('*')
          .eq('item_id', item_id)
          .eq('borrower_id', borrower_id)
          .eq('status', 'pending')
          .maybeSingle();
        if (!error && data) return data as BorrowRequest;
      } catch (e) {
        console.warn('Supabase getPendingRequest error:', e);
      }
    }

    for (const req of this.requests.values()) {
      if (req.item_id === item_id && req.borrower_id === borrower_id && req.status === 'pending') {
        return req;
      }
    }
    return null;
  }

  async getRequestsByBorrower(borrower_id: string): Promise<BorrowRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('borrow_requests')
          .select('*, items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
          .eq('borrower_id', borrower_id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((d: any) => ({
            ...d,
            item: d.items,
            borrower: d.borrower,
            owner: d.owner,
          })) as BorrowRequest[];
        }
      } catch (e) {
        console.warn('Supabase getRequestsByBorrower error, using local fallback:', e);
      }
    }

    const list: BorrowRequest[] = [];
    for (const req of this.requests.values()) {
      if (req.borrower_id === borrower_id) {
        list.push(await this.attachRequestRelations(req));
      }
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  async getRequestsByOwner(owner_id: string): Promise<BorrowRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('borrow_requests')
          .select('*, items(*), borrower:profiles!borrower_id(*), owner:profiles!owner_id(*)')
          .eq('owner_id', owner_id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((d: any) => ({
            ...d,
            item: d.items,
            borrower: d.borrower,
            owner: d.owner,
          })) as BorrowRequest[];
        }
      } catch (e) {
        console.warn('Supabase getRequestsByOwner error, using local fallback:', e);
      }
    }

    const list: BorrowRequest[] = [];
    for (const req of this.requests.values()) {
      if (req.owner_id === owner_id) {
        list.push(await this.attachRequestRelations(req));
      }
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  async updateRequestStatus(
    requestId: string,
    owner_id: string,
    status: 'approved' | 'rejected'
  ): Promise<BorrowRequest> {
    const req = this.requests.get(requestId);
    if (!req) {
      throw new Error('Borrow request not found.');
    }
    if (req.owner_id !== owner_id) {
      throw new Error('Forbidden: Only the item owner can accept or reject this request.');
    }
    if (req.status !== 'pending') {
      throw new Error(`Request has already been ${req.status}.`);
    }

    const item = await this.getItemById(req.item_id);
    if (!item) {
      throw new Error('Associated item not found.');
    }

    if (status === 'approved') {
      // Check if item is still available (race condition protection)
      if (!item.available) {
        throw new Error('Cannot approve: this item is no longer available.');
      }
      // Set request approved and mark item as unavailable
      req.status = 'approved';
      req.updated_at = new Date().toISOString();
      await this.setItemAvailability(req.item_id, false);
    } else {
      // Rejection: request becomes rejected, item remains available
      req.status = 'rejected';
      req.updated_at = new Date().toISOString();
    }

    this.requests.set(requestId, req);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('borrow_requests')
          .update({ status: req.status, updated_at: req.updated_at })
          .eq('id', requestId)
          .eq('owner_id', owner_id);
      } catch (e) {
        console.warn('Supabase updateRequestStatus error:', e);
      }
    }

    return this.attachRequestRelations(req);
  }

  private async attachRequestRelations(req: BorrowRequest): Promise<BorrowRequest> {
    const item = await this.getItemById(req.item_id);
    const borrower = await this.getProfileById(req.borrower_id);
    const owner = await this.getProfileById(req.owner_id);
    return {
      ...req,
      item: item || undefined,
      borrower: borrower || undefined,
      owner: owner || undefined,
    };
  }
}

export const db = new DatabaseService();
