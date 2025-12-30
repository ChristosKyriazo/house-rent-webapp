// Simple CUID generator for manual inserts
// Usage: node scripts/generate-cuid.js

function generateCUID() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'cl'; // CUIDs typically start with 'cl'
  for (let i = 0; i < 24; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Generate a single key
console.log(generateCUID());

// Or generate multiple keys
if (process.argv[2] && parseInt(process.argv[2]) > 1) {
  const count = parseInt(process.argv[2]);
  console.log('\n--- Multiple keys ---');
  for (let i = 0; i < count; i++) {
    console.log(generateCUID());
  }
}




