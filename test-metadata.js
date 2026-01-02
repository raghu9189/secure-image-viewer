const fs = require('fs');
const path = require('path');

const encryptedDir = path.join(__dirname, 'encrypted');
const files = fs.readdirSync(encryptedDir).filter(f => f.endsWith('.enc'));

if (files.length > 0) {
  const testFile = files[0];
  console.log('Testing file:', testFile);
  
  const filePath = path.join(encryptedDir, testFile);
  const content = fs.readFileSync(filePath);
  
  const metadataLength = content.readUInt32BE(0);
  console.log('Metadata length:', metadataLength);
  
  const metadataBuffer = content.subarray(4, 4 + metadataLength);
  const metadata = JSON.parse(metadataBuffer.toString('utf8'));
  
  console.log('Metadata:', JSON.stringify(metadata, null, 2));
} else {
  console.log('No encrypted files found');
}
