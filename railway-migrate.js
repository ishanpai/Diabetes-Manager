#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync } = require('fs');

console.log('🚀 Railway Migration Script Starting...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please ensure you have a PostgreSQL database configured in Railway');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');

// Check if drizzle directory exists
if (!existsSync('./drizzle')) {
  console.error('❌ Drizzle migrations directory not found');
  console.log('Make sure the drizzle directory is included in your deployment');
  process.exit(1);
}

console.log('✅ Drizzle migrations directory found');

try {
  console.log('🔄 Running database migrations...');
  
  // Run migrations
  execSync('npx drizzle-kit migrate', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('✅ Migrations completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} 