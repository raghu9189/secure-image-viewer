const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const readline = require("readline");

const ENCRYPTED_DIR = path.join(__dirname, "encrypted");

// Ensure encrypted directory exists
if (!fs.existsSync(ENCRYPTED_DIR)) {
  fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });
}

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heif', '.heic'];

// MIME type mapping
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.heif': 'image/heif',
  '.heic': 'image/heic'
};

/**
 * Encrypt file with embedded metadata
 */
function encryptFile(inputPath, outputPath, key, metadata) {
  const algorithm = "aes-256-cbc";
  const keyHash = crypto.createHash("sha256").update(key).digest();
  const iv = crypto.randomBytes(16);
  
  const input = fs.readFileSync(inputPath);
  const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
  
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  
  // Create file structure:
  // [4 bytes: metadata length] [metadata JSON] [16 bytes: IV] [encrypted data]
  const metadataJson = JSON.stringify(metadata);
  const metadataBuffer = Buffer.from(metadataJson, 'utf8');
  const metadataLength = Buffer.alloc(4);
  metadataLength.writeUInt32BE(metadataBuffer.length, 0);
  
  const output = Buffer.concat([metadataLength, metadataBuffer, iv, encrypted]);
  fs.writeFileSync(outputPath, output);
  
  return true;
}

/**
 * Get all image files from directory (recursively)
 */
function getImageFiles(dir, recursive = false) {
  const images = [];
  
  function scanDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && recursive) {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (IMAGE_EXTENSIONS.includes(ext)) {
            images.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error.message);
    }
  }
  
  scanDir(dir);
  return images;
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main batch encryption function
 */
async function batchEncrypt() {
  console.log("═".repeat(60));
  console.log("🔒 Batch Image Encryption Tool");
  console.log("═".repeat(60));
  console.log();
  
  // Get source directory
  const sourceDir = await prompt("Enter source directory path: ");
  
  if (!sourceDir.trim()) {
    console.log("❌ Error: Directory path is required");
    return;
  }
  
  const normalizedPath = path.resolve(sourceDir.trim());
  
  if (!fs.existsSync(normalizedPath)) {
    console.log(`❌ Error: Directory not found: ${normalizedPath}`);
    return;
  }
  
  if (!fs.statSync(normalizedPath).isDirectory()) {
    console.log(`❌ Error: Path is not a directory: ${normalizedPath}`);
    return;
  }
  
  // Ask if recursive
  const recursiveInput = await prompt("Scan subdirectories recursively? (y/n) [n]: ");
  const recursive = recursiveInput.trim().toLowerCase() === 'y';
  
  // Find all images
  console.log();
  console.log("🔍 Scanning for images...");
  const imageFiles = getImageFiles(normalizedPath, recursive);
  
  if (imageFiles.length === 0) {
    console.log("❌ No image files found in the specified directory");
    return;
  }
  
  console.log(`✅ Found ${imageFiles.length} image(s)`);
  console.log();
  
  // Show files
  console.log("Images to encrypt:");
  imageFiles.forEach((file, index) => {
    const stat = fs.statSync(file);
    const relativePath = path.relative(normalizedPath, file);
    console.log(`  ${index + 1}. ${relativePath} (${formatSize(stat.size)})`);
  });
  console.log();
  
  // Get encryption key
  const encryptionKey = await prompt("Enter encryption key (min 4 characters): ");
  
  if (!encryptionKey || encryptionKey.length < 4) {
    console.log("❌ Error: Encryption key must be at least 4 characters");
    return;
  }
  
  // Confirm key
  const confirmKey = await prompt("Confirm encryption key: ");
  
  if (encryptionKey !== confirmKey) {
    console.log("❌ Error: Keys do not match");
    return;
  }
  
  // Ask for custom name prefix (optional)
  const namePrefix = await prompt("Custom name prefix (optional, press Enter to use original names): ");
  
  // Final confirmation
  console.log();
  console.log(`⚠️  About to encrypt ${imageFiles.length} image(s)`);
  const confirm = await prompt("Continue? (y/n): ");
  
  if (confirm.trim().toLowerCase() !== 'y') {
    console.log("❌ Operation cancelled");
    return;
  }
  
  console.log();
  console.log("🔒 Starting encryption...");
  console.log();
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const fileName = path.basename(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const relativePath = path.relative(normalizedPath, imagePath);
    
    try {
      const stat = fs.statSync(imagePath);
      const fileId = uuidv4();
      const encryptedFilename = `${fileId}.enc`;
      const encryptedPath = path.join(ENCRYPTED_DIR, encryptedFilename);
      
      // Prepare metadata
      const originalName = namePrefix.trim() 
        ? `${namePrefix.trim()} ${i + 1}${ext}`
        : fileName;
      
      const metadata = {
        id: fileId,
        originalName: originalName,
        mimeType: MIME_TYPES[ext] || 'application/octet-stream',
        size: stat.size,
        encryptedAt: new Date().toISOString(),
        sourcePath: relativePath
      };
      
      // Encrypt
      encryptFile(imagePath, encryptedPath, encryptionKey, metadata);
      
      console.log(`✅ [${i + 1}/${imageFiles.length}] ${relativePath}`);
      successCount++;
      
      results.push({
        success: true,
        original: relativePath,
        encrypted: encryptedFilename,
        name: originalName
      });
      
    } catch (error) {
      console.log(`❌ [${i + 1}/${imageFiles.length}] ${relativePath} - ${error.message}`);
      failCount++;
      
      results.push({
        success: false,
        original: relativePath,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log();
  console.log("═".repeat(60));
  console.log("📊 Encryption Summary");
  console.log("═".repeat(60));
  console.log(`✅ Successfully encrypted: ${successCount} file(s)`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} file(s)`);
  }
  console.log(`📁 Encrypted files saved to: ${ENCRYPTED_DIR}`);
  console.log();
  
  // Ask if user wants to save report
  const saveReport = await prompt("Save detailed report to file? (y/n) [n]: ");
  
  if (saveReport.trim().toLowerCase() === 'y') {
    const reportPath = path.join(__dirname, `encryption-report-${Date.now()}.json`);
    const report = {
      timestamp: new Date().toISOString(),
      sourceDirectory: normalizedPath,
      recursive: recursive,
      totalFiles: imageFiles.length,
      successful: successCount,
      failed: failCount,
      results: results
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${reportPath}`);
  }
  
  console.log();
  console.log("✨ Done!");
}

// Run the batch encryption
batchEncrypt().catch(error => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
