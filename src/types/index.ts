export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string;
  phone?: string;
  bio?: string;
  createdAt?: string;
  lastToken?: string;
}

export interface UserSession {
  user: User;
  token?: string;
  accessToken?: string;
}

export interface Donation {
  order_id: string;
  orderId?: string;
  amount: number;
  gross_amount?: number;
  status: string;
  payment_type?: string;
  paymentType?: string;
  transaction_time?: string;
  createdAt?: number;
  username?: string;
  avatar?: string;
}

export interface RankingItem {
  username: string;
  avatar?: string;
  totalAmount: number;
  txCount: number;
}

export interface RankingData {
  daily: RankingItem[];
  weekly: RankingItem[];
  lifetime: RankingItem[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  category?: string;
  duration?: string;
  thumbnail?: string;
  source?: 'youtube' | 'itunes';
  previewUrl?: string;
}
