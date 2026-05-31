import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Charan@123',
    host: process.env.POSTGRES_SERVER || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'AgriMart',
  });

  try {
    await client.connect();
    
    console.log('Executing Supabase columns migration...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_uid UUID UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
    `);
    console.log('Supabase columns added successfully.');
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
