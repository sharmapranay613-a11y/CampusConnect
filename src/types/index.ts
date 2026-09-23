export interface Profile {
  id: string;
  full_name: string;
  email: string;
  department: string;
  year: string;
  created_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  image_url: string;
  pickup_location: string;
  borrow_duration: string;
  available: boolean;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    department: string;
    year: string;
  };
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface BorrowRequest {
  id: string;
  item_id: string;
  borrower_id: string;
  owner_id: string;
  status: RequestStatus;
  borrower_phone?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
  item?: Item;
  borrower?: {
    id: string;
    full_name: string;
    email: string;
    department: string;
    year: string;
  };
  owner?: {
    id: string;
    full_name: string;
    email: string;
    department: string;
    year: string;
  };
}

export interface AuthResponse {
  user: Profile;
  token: string;
}
