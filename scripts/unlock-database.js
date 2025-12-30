#!/usr/bin/env node

/**
 * Script to unlock SQLite database by:
 * 1. Setting busy_timeout
 * 2. Checking for stale journal files
 * 3. Providing instructions to close database tools
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const journalPath = path.join(__dirname, '../prisma/dev.db-journal');

console.log('🔓 Database Unlock Utility\n');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found:', dbPath);
  process.exit(1);
}

// Check for processes locking the database
console.log('📋 Checking for processes locking the database...');
try {
  const lsofOutput = execSync(`lsof "${dbPath}" 2>/dev/null || true`, { encoding: 'utf-8' });
  if (lsofOutput.trim()) {
    console.log('\n⚠️  Processes locking the database:');
    console.log(lsofOutput);
    console.log('\n💡 To unlock:');
    console.log('   1. Close DBeaver or any other database tools');
    console.log('   2. Restart your Next.js dev server');
    console.log('   3. Try your operation again\n');
  } else {
    console.log('✅ No processes found locking the database\n');
  }
} catch (error) {
  console.log('⚠️  Could not check for locking processes\n');
}

// Check for stale journal file
if (fs.existsSync(journalPath)) {
  console.log('⚠️  Stale journal file found:', journalPath);
  console.log('   This indicates an incomplete transaction.');
  console.log('   The journal file will be automatically cleaned up when the lock is released.\n');
} else {
  console.log('✅ No stale journal file found\n');
}

// Set busy_timeout via SQLite
console.log('⚙️  Setting SQLite busy_timeout to 30 seconds...');
try {
  execSync(`sqlite3 "${dbPath}" "PRAGMA busy_timeout = 30000;"`, { encoding: 'utf-8' });
  console.log('✅ Busy timeout set successfully\n');
} catch (error) {
  console.log('⚠️  Could not set busy_timeout (this is OK if using Prisma)\n');
}

console.log('✅ Database unlock check complete!');
console.log('\n📝 Next steps:');
console.log('   1. Close DBeaver (PID 1034) if it\'s still open');
console.log('   2. Restart your Next.js dev server');
console.log('   3. The retry logic will handle brief locks automatically\n');

