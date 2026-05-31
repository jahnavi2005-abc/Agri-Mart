import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client from PostgreSQL pool', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL local database.');
    release();
  }
});

export default pool;
