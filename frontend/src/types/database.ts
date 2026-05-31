export type UserRole = "farmer" | "buyer" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  district: string | null;
  state: string | null;
  address: string | null;
  language: string;
  is_verified: boolean;
  is_banned: boolean;
  seller_trust_level: number;
  kyc_status?: "not_started" | "pending" | "approved" | "rejected";
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
};

export type FarmerProfile = {
  id: string;
  user_id: string;
  farm_name: string | null;
  farm_size_acres: number | null;
  primary_crops: string[];
  aadhaar_last4: string | null;
  kyc_status: "not_started" | "pending" | "approved" | "rejected";
  kyc_document_url: string | null;
  bank_account_last4: string | null;
  upi_id: string | null;
  rating: number;
  total_sales: number;
  created_at: string;
  updated_at: string;
};
