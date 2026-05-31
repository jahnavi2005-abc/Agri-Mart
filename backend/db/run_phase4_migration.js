import pg from 'pg';
import fs from 'fs';
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
    
    const sqlPath = path.join(__dirname, 'phase4_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing phase4_migration.sql...');
    await client.query(sql);
    console.log('Migration executed successfully.');
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
