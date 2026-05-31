import { supabase } from "@/lib/supabase";

export type PriceHistory = {
  id: string;
  crop_name: string;
  district: string;
  mandi_price: number;
  platform_avg_price: number | null;
  recorded_date: string;
  created_at: string;
};

export async function listPriceHistory(cropName?: string) {
  let query = supabase
    .from("price_history")
    .select("*")
    .order("recorded_date", { ascending: false })
    .limit(50);
  if (cropName) query = query.ilike("crop_name", `%${cropName}%`);
  const { data, error } = await query.returns<PriceHistory[]>();
  if (error) throw error;
  return data ?? [];
}
