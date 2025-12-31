// Simple function to generate unique keys (CUID-like format)
function generateKey(index) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'cl';
  for (let i = 0; i < 24; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Generate 83 unique keys
const keys = [];
for (let i = 0; i < 83; i++) {
  keys.push(generateKey(i));
}

console.log(JSON.stringify(keys, null, 2));








