import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { 
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket }
  }
);

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const CROP_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Spices'];
const CROPS = [
  { name: 'Tomatoes', category: 'Vegetables', grade: 'A', price: 40 },
  { name: 'Potatoes', category: 'Vegetables', grade: 'B', price: 25 },
  { name: 'Apples', category: 'Fruits', grade: 'A', price: 150 },
  { name: 'Bananas', category: 'Fruits', grade: 'A', price: 50 },
  { name: 'Wheat', category: 'Grains', grade: 'A', price: 30 },
  { name: 'Rice (Basmati)', category: 'Grains', grade: 'A', price: 110 },
  { name: 'Turmeric', category: 'Spices', grade: 'A', price: 200 },
  { name: 'Onions', category: 'Vegetables', grade: 'C', price: 35 },
  { name: 'Mangoes', category: 'Fruits', grade: 'A', price: 300 },
  { name: 'Black Pepper', category: 'Spices', grade: 'A', price: 500 },
];

async function uploadDummyImageToS3(filename) {
  try {
    // Fetch a tiny dummy image
    const response = await fetch('https://picsum.photos/400/300');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const key = `seed-images/${Date.now()}-${filename}.jpg`;
    
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg'
    }));

    // Construct the public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
    console.log(`Uploaded image to S3: ${url}`);
    return url;
  } catch (error) {
    console.error('Failed to upload image to S3:', error);
    // Return a generic fallback URL if S3 upload fails
    return 'https://picsum.photos/400/300'; 
  }
}

async function seed() {
  console.log('Starting database seed...');
  
  try {
    const defaultPassword = 'Charan@123';

    // Helper to create user in Supabase + DB
    async function getOrCreateUser(email, name, role, phone) {
      const exists = await pool.query('SELECT id, supabase_uid FROM users WHERE email = $1', [email]);
      if (exists.rows.length > 0) return exists.rows[0].id;

      // Create in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { name, role, phone, district: 'Guntur', state: 'Andhra Pradesh' },
      });
      if (error && !error.message.includes('already registered')) throw error;
      
      const supabaseUid = data?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id;

      const res = await pool.query(
        `INSERT INTO users (name, email, password_hash, phone, role, district, state, is_verified, supabase_uid) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [name, email, 'supabase-managed', phone, role, 'Guntur', 'Andhra Pradesh', true, supabaseUid]
      );
      return res.rows[0].id;
    }

    // 1. Create 2 Buyers
    console.log('Creating 2 buyers...');
    const buyerIds = [];
    for (let i = 1; i <= 2; i++) {
      const id = await getOrCreateUser(`buyer${i}@example.com`, `Buyer ${i}`, 'buyer', `+91987654321${i}`);
      buyerIds.push(id);
    }

    // 2. Create 5 Farmers and Profiles
    console.log('Creating 5 farmers and their profiles...');
    const farmerIds = [];
    for (let i = 1; i <= 5; i++) {
      const id = await getOrCreateUser(`farmer${i}@example.com`, `Farmer ${i}`, 'farmer', `+91876543210${i}`);
      
      const profileExists = await pool.query('SELECT id FROM farmer_profiles WHERE user_id = $1', [id]);
      if (profileExists.rows.length === 0) {
        await pool.query(
          `INSERT INTO farmer_profiles (user_id, farm_name, farm_size_acres, kyc_status, rating) 
           VALUES ($1, $2, $3, $4, $5)`,
          [id, `Green Farm ${i}`, Math.floor(Math.random() * 20) + 1, 'approved', 4.5]
        );
      }
      farmerIds.push(id);
    }

    // 3. Create 10 Crops (Products) with uploaded S3 images
    console.log('Uploading 10 placeholder images to S3 and creating crops...');
    for (let i = 0; i < 10; i++) {
      const crop = CROPS[i];
      const farmerId = farmerIds[i % farmerIds.length]; // Distribute crops among farmers
      
      const imageUrl = await uploadDummyImageToS3(`crop-${i+1}`);
      
      // Delete existing dummy crops to avoid duplication
      await pool.query('DELETE FROM products WHERE crop_name = $1 AND description = $2', [crop.name, 'Dummy Seed Data']);

      await pool.query(
        `INSERT INTO products (
          farmer_id, crop_name, category, description, quantity_kg, available_quantity_kg, 
          minimum_order_kg, price_per_kg, grade, is_organic, listing_type, 
          district, state, image_urls, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          farmerId,
          crop.name,
          crop.category,
          'Dummy Seed Data',
          1000,
          1000,
          50,
          crop.price,
          crop.grade,
          Math.random() > 0.5,
          'immediate',
          'Guntur',
          'Andhra Pradesh',
          JSON.stringify([imageUrl]),
          'active'
        ]
      );
    }

    console.log('✅ Seed completed successfully!');
    console.log('\n--- Login Credentials ---');
    console.log('Password for all users: Charan@123');
    console.log('Buyers: buyer1@example.com, buyer2@example.com');
    console.log('Farmers: farmer1@example.com to farmer5@example.com');
    
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();
