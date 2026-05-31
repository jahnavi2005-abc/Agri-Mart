import pool from './index.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, 'phase5_migration.sql'), 'utf8');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running Phase 5 migration...');
    await client.query(sql);
    console.log('✅ Phase 5 migration complete!');
    console.log('   - notifications table created');
    console.log('   - enquiries table created');
    console.log('   - flagged column added to products');
    console.log('   - low stock trigger installed');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
