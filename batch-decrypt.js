#!/usr/bin/env node

/**
 * Batch Decrypt Script
 * Decrypts multiple encrypted images from the encrypted/ directory
 * 
 * Usage:
 *   node batch-decrypt.js <decryption-key> [output-directory] [album-name]
 * 
 * Examples:
 *   node batch-decrypt.js mySecretKey123
 *   node batch-decrypt.js mySecretKey123 ./decrypted-images
 *   node batch-decrypt.js mySecretKey123 ./decrypted-images vacation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const ENCRYPTED_DIR = path.join(__dirname, 'encrypted');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'decrypted');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Error: Decryption key is required');
  console.log('\nUsage:');
  console.log('  node batch-decrypt.js <decryption-key> [output-directory] [album-name]');
  console.log('\nExamples:');
  console.log('  node batch-decrypt.js mySecretKey123');
  console.log('  node batch-decrypt.js mySecretKey123 ./decrypted-images');
  console.log('  node batch-decrypt.js mySecretKey123 ./decrypted-images vacation');
  process.exit(1);
}

const DECRYPTION_KEY = args[0];
const OUTPUT_DIR = args[1] || DEFAULT_OUTPUT_DIR;
const ALBUM_NAME = args[2] || null; // null means decrypt all albums

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);
}

/**
 * Read metadata from encrypted file
 */
function readMetadata(filePath) {
  const data = fs.readFileSync(filePath);
  const metadataLength = data.readUInt32BE(0);
  const metadataBuffer = data.slice(4, 4 + metadataLength);
  return JSON.parse(metadataBuffer.toString('utf8'));
}

/**
 * Decrypt a single file
 */
function decryptFile(filePath, key) {
  const algorithm = 'aes-256-cbc';
  const keyHash = crypto.createHash('sha256').update(key).digest();
  
  const fileContent = fs.readFileSync(filePath);
  
  // Read metadata
  const metadataLength = fileContent.readUInt32BE(0);
  const metadataBuffer = fileContent.subarray(4, 4 + metadataLength);
  const metadata = JSON.parse(metadataBuffer.toString('utf8'));
  
  if (!metadata.tags) {
    metadata.tags = [];
  }
  
  // Read IV and encrypted data
  const ivStart = 4 + metadataLength;
  const iv = fileContent.subarray(ivStart, ivStart + 16);
  const encrypted = fileContent.subarray(ivStart + 16);
  
  // Decrypt using SHA-256 hash of the key (same as server)
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return { decrypted, metadata };
}

/**
 * Get all encrypted files from a directory
 */
function getEncryptedFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  
  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.enc'))
    .map(file => path.join(directory, file));
}

/**
 * Sanitize filename to be safe for filesystem
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9._-]/gi, '_');
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMimeType(mimeType) {
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg'
  };
  return mimeMap[mimeType] || '.jpg';
}

/**
 * Process and decrypt files
 */
function batchDecrypt() {
  console.log('🔓 Batch Decryption Started');
  console.log('═'.repeat(50));
  console.log(`🔑 Using decryption key: ${DECRYPTION_KEY.substring(0, 3)}${'*'.repeat(DECRYPTION_KEY.length - 3)}`);
  console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  
  let filesToProcess = [];
  let albumDirs = [];
  
  // Determine which files to process
  if (ALBUM_NAME) {
    console.log(`📁 Album filter: ${ALBUM_NAME}`);
    if (ALBUM_NAME === 'default') {
      // Get files from root encrypted directory only
      filesToProcess = getEncryptedFiles(ENCRYPTED_DIR);
      albumDirs = [{ name: 'default', path: ENCRYPTED_DIR, files: filesToProcess }];
    } else {
      // Get files from specific album subdirectory
      const albumPath = path.join(ENCRYPTED_DIR, ALBUM_NAME);
      if (!fs.existsSync(albumPath)) {
        console.error(`❌ Error: Album "${ALBUM_NAME}" not found`);
        process.exit(1);
      }
      filesToProcess = getEncryptedFiles(albumPath);
      albumDirs = [{ name: ALBUM_NAME, path: albumPath, files: filesToProcess }];
    }
  } else {
    console.log('📁 Processing all albums');
    // Get files from root
    const rootFiles = getEncryptedFiles(ENCRYPTED_DIR);
    if (rootFiles.length > 0) {
      albumDirs.push({ name: 'default', path: ENCRYPTED_DIR, files: rootFiles });
    }
    
    // Get files from all subdirectories (albums)
    const items = fs.readdirSync(ENCRYPTED_DIR, { withFileTypes: true });
    const directories = items.filter(item => item.isDirectory());
    
    for (const dir of directories) {
      const albumPath = path.join(ENCRYPTED_DIR, dir.name);
      const albumFiles = getEncryptedFiles(albumPath);
      if (albumFiles.length > 0) {
        albumDirs.push({ name: dir.name, path: albumPath, files: albumFiles });
      }
    }
    
    filesToProcess = albumDirs.flatMap(album => album.files);
  }
  
  console.log(`📊 Found ${filesToProcess.length} encrypted file(s) in ${albumDirs.length} album(s)\n`);
  
  if (filesToProcess.length === 0) {
    console.log('ℹ️  No encrypted files found to process');
    return;
  }
  
  let successCount = 0;
  let failedCount = 0;
  const failedFiles = [];
  
  // Process each album
  for (const album of albumDirs) {
    console.log(`\n📁 Processing album: ${album.name}`);
    console.log('─'.repeat(50));
    
    // Create album subdirectory in output
    const albumOutputDir = path.join(OUTPUT_DIR, album.name);
    if (!fs.existsSync(albumOutputDir)) {
      fs.mkdirSync(albumOutputDir, { recursive: true });
    }
    
    // Decrypt each file in the album
    for (const filePath of album.files) {
      const fileName = path.basename(filePath);
      
      try {
        // Decrypt the file
        const { decrypted, metadata } = decryptFile(filePath, DECRYPTION_KEY);
        
        // Generate output filename
        const originalName = metadata.originalName || fileName.replace('.enc', '');
        const extension = getExtensionFromMimeType(metadata.mimeType);
        let outputFileName = sanitizeFilename(originalName);
        
        // Ensure it has the correct extension
        if (!outputFileName.toLowerCase().endsWith(extension.toLowerCase())) {
          const lastDot = outputFileName.lastIndexOf('.');
          if (lastDot > 0) {
            outputFileName = outputFileName.substring(0, lastDot) + extension;
          } else {
            outputFileName += extension;
          }
        }
        
        // Write decrypted file
        const outputPath = path.join(albumOutputDir, outputFileName);
        fs.writeFileSync(outputPath, decrypted);
        
        console.log(`  ✅ ${fileName} → ${outputFileName}`);
        console.log(`     Size: ${(decrypted.length / 1024).toFixed(2)} KB`);
        if (metadata.tags && metadata.tags.length > 0) {
          console.log(`     Tags: ${metadata.tags.join(', ')}`);
        }
        
        successCount++;
      } catch (error) {
        console.log(`  ❌ ${fileName} - Failed: ${error.message}`);
        failedCount++;
        failedFiles.push({ file: fileName, album: album.name, error: error.message });
      }
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Batch Decryption Summary');
  console.log('═'.repeat(50));
  console.log(`✅ Successfully decrypted: ${successCount} file(s)`);
  console.log(`❌ Failed to decrypt: ${failedCount} file(s)`);
  console.log(`📂 Output location: ${OUTPUT_DIR}`);
  
  if (failedFiles.length > 0) {
    console.log('\n⚠️  Failed files:');
    failedFiles.forEach(({ file, album, error }) => {
      console.log(`   - ${file} (${album}): ${error}`);
    });
    console.log('\n💡 Tip: Make sure you are using the correct decryption key');
  }
  
  console.log('\n✨ Batch decryption completed!\n');
}

// Run the batch decryption
try {
  batchDecrypt();
} catch (error) {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
}
