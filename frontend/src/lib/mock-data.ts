export type Product = {
  id: string;
  crop_name: string;
  category: string;
  price_per_kg: number;
  quantity_kg: number;
  image_url: string;
  district: string;
  state: string;
  is_organic: boolean;
  farmer_name: string;
  farmer_avatar?: string;
  harvest_date: string;
  description?: string;
};

const imgs = [
  "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
  "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80",
  "https://images.unsplash.com/photo-1546470427-227e0b8a4d7c?w=600&q=80",
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&q=80",
  "https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=600&q=80",
  "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=600&q=80",
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    crop_name: "Sona Masuri Rice",
    category: "Grains",
    price_per_kg: 28,
    quantity_kg: 1200,
    image_url: imgs[0],
    district: "Guntur",
    state: "Andhra Pradesh",
    is_organic: true,
    farmer_name: "Ravi Kumar",
    harvest_date: "2026-04-15",
    description:
      "Premium aged Sona Masuri rice from Krishna delta. Naturally polished, no chemicals.",
  },
  {
    id: "2",
    crop_name: "Sharbati Wheat",
    category: "Grains",
    price_per_kg: 32,
    quantity_kg: 800,
    image_url: imgs[1],
    district: "Sehore",
    state: "Madhya Pradesh",
    is_organic: false,
    farmer_name: "Suresh Patel",
    harvest_date: "2026-04-02",
  },
  {
    id: "3",
    crop_name: "Roma Tomatoes",
    category: "Vegetables",
    price_per_kg: 18,
    quantity_kg: 320,
    image_url: imgs[2],
    district: "Kolar",
    state: "Karnataka",
    is_organic: true,
    farmer_name: "Lakshmi Devi",
    harvest_date: "2026-04-28",
  },
  {
    id: "4",
    crop_name: "Guntur Red Chili",
    category: "Spices",
    price_per_kg: 240,
    quantity_kg: 150,
    image_url: imgs[3],
    district: "Guntur",
    state: "Andhra Pradesh",
    is_organic: false,
    farmer_name: "Venkat Rao",
    harvest_date: "2026-03-20",
  },
  {
    id: "5",
    crop_name: "Alphonso Mango",
    category: "Fruits",
    price_per_kg: 380,
    quantity_kg: 90,
    image_url: imgs[4],
    district: "Ratnagiri",
    state: "Maharashtra",
    is_organic: true,
    farmer_name: "Pravin Joshi",
    harvest_date: "2026-04-25",
  },
  {
    id: "6",
    crop_name: "Toor Dal",
    category: "Pulses",
    price_per_kg: 110,
    quantity_kg: 600,
    image_url: imgs[5],
    district: "Latur",
    state: "Maharashtra",
    is_organic: false,
    farmer_name: "Anil Deshmukh",
    harvest_date: "2026-03-10",
  },
  {
    id: "7",
    crop_name: "Organic Turmeric",
    category: "Spices",
    price_per_kg: 180,
    quantity_kg: 240,
    image_url: imgs[6],
    district: "Erode",
    state: "Tamil Nadu",
    is_organic: true,
    farmer_name: "Murugan S",
    harvest_date: "2026-02-28",
  },
  {
    id: "8",
    crop_name: "Basmati Rice",
    category: "Grains",
    price_per_kg: 95,
    quantity_kg: 500,
    image_url: imgs[7],
    district: "Karnal",
    state: "Haryana",
    is_organic: false,
    farmer_name: "Harpreet Singh",
    harvest_date: "2026-04-10",
  },
];

export const TICKER = MOCK_PRODUCTS.map(
  (p) => `${p.crop_name.split(" ")[0]} ₹${p.price_per_kg}/kg`,
);
