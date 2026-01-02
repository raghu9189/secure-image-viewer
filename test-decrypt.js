const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get first encrypted file
const encryptedDir = path.join(__dirname, 'encrypted');
const files = fs.readdirSync(encryptedDir).filter(f => f.endsWith('.enc'));

if (files.length === 0) {
  console.log('No files to test');
  process.exit(0);
}

const testFile = files[0];
const filePath = path.join(encryptedDir, testFile);

console.log('Testing file:', testFile);

// Read metadata
const fileContent = fs.readFileSync(filePath);
const metadataLength = fileContent.readUInt32BE(0);
const metadataBuffer = fileContent.subarray(4, 4 + metadataLength);
const metadata = JSON.parse(metadataBuffer.toString('utf8'));

console.log('Metadata:', metadata);

// Try to decrypt with a test key
const testKey = 'test123';

function decryptFile(inputPath, key) {
  const algorithm = 'aes-256-cbc';
  const keyHash = crypto.createHash('sha256').update(key).digest();
  
  const fileContent = fs.readFileSync(inputPath);
  
  const metadataLength = fileContent.readUInt32BE(0);
  const metadataBuffer = fileContent.subarray(4, 4 + metadataLength);
  const metadata = JSON.parse(metadataBuffer.toString('utf8'));
  
  if (!metadata.tags) {
    metadata.tags = [];
  }
  
  const ivStart = 4 + metadataLength;
  const iv = fileContent.subarray(ivStart, ivStart + 16);
  const encrypted = fileContent.subarray(ivStart + 16);
  
  console.log('IV length:', iv.length);
  console.log('Encrypted data length:', encrypted.length);
  
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  
  return { decrypted, metadata };
}

try {
  const result = decryptFile(filePath, testKey);
  console.log('Decryption successful!');
  console.log('Decrypted size:', result.decrypted.length);
  
  // Try to save it
  const outputPath = path.join(__dirname, 'test-output.jpg');
  fs.writeFileSync(outputPath, result.decrypted);
  console.log('Saved to:', outputPath);
} catch (error) {
  console.error('Decryption failed:', error.message);
  console.log('This is expected if you used a wrong key. Try the actual key you used.');
}
