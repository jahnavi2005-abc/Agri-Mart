import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  console.log('Connecting to default postgres database...');
  // Connect to the default 'postgres' database to create the new database
  const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Charan@123',
    host: process.env.POSTGRES_SERVER || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: 'postgres', 
  });

  try {
    await client.connect();

    const dbName = process.env.POSTGRES_DB || 'AgriMart';
    
    // Check if database exists
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`);
    
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" not found. Creating it...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Connect to the newly created database and run init.sql
  console.log('Connecting to the AgriMart database to run schema initialization...');
  const appClient = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Charan@123',
    host: process.env.POSTGRES_SERVER || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'AgriMart',
  });

  try {
    await appClient.connect();
    
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    console.log('Executing init.sql...');
    await appClient.query(initSql);
    console.log('Schema initialized successfully.');
  } catch (error) {
    console.error('Error executing init.sql:', error);
    process.exit(1);
  } finally {
    await appClient.end();
  }
}

setupDatabase();
