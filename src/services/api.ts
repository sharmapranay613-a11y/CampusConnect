import type { Profile, Item, BorrowRequest } from '../types/index.js';
import { supabase, isSupabaseClientConfigured } from '../lib/supabase.js';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('campusconnect_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data as T;
}

export const api = {
  // --- Auth ---
  auth: {
    async register(payload: {
      full_name: string;
      email: string;
      department: string;
      year: string;
      password: string;
    }): Promise<{ user: Profile; token: string; message: string }> {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },

    async login(payload: {
      email: string;
      password: string;
    }): Promise<{ user: Profile; token: string; message: string }> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },

    async getProfile(): Promise<{ user: Profile }> {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse(res);
    },
  },

  // --- Items ---
  items: {
    async getAll(params?: { search?: string; category?: string; owner_id?: string }): Promise<Item[]> {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.category && params.category !== 'All') query.set('category', params.category);
      if (params?.owner_id) query.set('owner_id', params.owner_id);

      const qs = query.toString();
      const res = await fetch(`${API_BASE}/items${qs ? `?${qs}` : ''}`);
      const data = await handleResponse<{ items: Item[] }>(res);
      return data.items || [];
    },

    async getById(id: string): Promise<Item> {
      const res = await fetch(`${API_BASE}/items/${id}`);
      const data = await handleResponse<{ item: Item }>(res);
      return data.item;
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
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(itemData),
      });
      const data = await handleResponse<{ item: Item }>(res);
      return data.item;
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
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(itemData),
      });
      const data = await handleResponse<{ item: Item }>(res);
      return data.item;
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      await handleResponse(res);
    },
  },

  // --- Borrow Requests ---
  requests: {
    async create(itemId: string): Promise<BorrowRequest> {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await handleResponse<{ request: BorrowRequest }>(res);
      return data.request;
    },

    async getMyRequests(): Promise<BorrowRequest[]> {
      const res = await fetch(`${API_BASE}/requests/my`, {
        headers: { ...getAuthHeader() },
      });
      const data = await handleResponse<{ requests: BorrowRequest[] }>(res);
      return data.requests || [];
    },

    async getIncomingRequests(): Promise<BorrowRequest[]> {
      const res = await fetch(`${API_BASE}/requests/incoming`, {
        headers: { ...getAuthHeader() },
      });
      const data = await handleResponse<{ requests: BorrowRequest[] }>(res);
      return data.requests || [];
    },

    async approve(requestId: string): Promise<BorrowRequest> {
      const res = await fetch(`${API_BASE}/requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { ...getAuthHeader() },
      });
      const data = await handleResponse<{ request: BorrowRequest }>(res);
      return data.request;
    },

    async reject(requestId: string): Promise<BorrowRequest> {
      const res = await fetch(`${API_BASE}/requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { ...getAuthHeader() },
      });
      const data = await handleResponse<{ request: BorrowRequest }>(res);
      return data.request;
    },
  },

  // --- Storage / Image Upload ---
  async uploadImage(file: File): Promise<string> {
    // If Supabase Storage is configured and available
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
        console.warn('Supabase storage upload failed, using high-performance client base64 reader:', err);
      }
    }

    // High performance client-side image reader & compressor
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
