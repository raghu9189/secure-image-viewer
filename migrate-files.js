const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ENCRYPTED_DIR = path.join(__dirname, "encrypted");

/**
 * Migration script to convert old format (.enc + .json) to new format (single .enc file)
 * Old format: separate .enc file (IV + encrypted data) and .json file (metadata)
 * New format: single .enc file (metadata length + metadata + IV + encrypted data)
 */

// Function to read old format encrypted file (IV at start)
function readOldEncryptedFile(filePath) {
  const fileContent = fs.readFileSync(filePath);
  const iv = fileContent.subarray(0, 16);
  const encrypted = fileContent.subarray(16);
  return { iv, encrypted };
}

// Function to write new format file (metadata length + metadata + IV + encrypted data)
function writeNewFormatFile(outputPath, metadata, iv, encrypted) {
  const metadataJson = JSON.stringify(metadata);
  const metadataBuffer = Buffer.from(metadataJson, 'utf8');
  const metadataLength = Buffer.alloc(4);
  metadataLength.writeUInt32BE(metadataBuffer.length, 0);
  
  const output = Buffer.concat([metadataLength, metadataBuffer, iv, encrypted]);
  fs.writeFileSync(outputPath, output);
}

function migrateFiles() {
  try {
    console.log("🔄 Starting migration of encrypted files...\n");
    
    if (!fs.existsSync(ENCRYPTED_DIR)) {
      console.log("❌ Encrypted directory not found!");
      return;
    }
    
    const files = fs.readdirSync(ENCRYPTED_DIR);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    
    if (jsonFiles.length === 0) {
      console.log("✅ No files to migrate. All files are already in new format or no files exist.");
      return;
    }
    
    console.log(`Found ${jsonFiles.length} file(s) to migrate:\n`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const jsonFile of jsonFiles) {
      const id = jsonFile.replace(".json", "");
      const jsonPath = path.join(ENCRYPTED_DIR, jsonFile);
      const oldEncPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
      
      console.log(`Processing: ${id}`);
      
      if (!fs.existsSync(oldEncPath)) {
        console.log(`  ⚠️  Skipped: .enc file not found\n`);
        skipped++;
        continue;
      }
      
      try {
        // Read metadata from JSON file
        const metadata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        
        // Read old format encrypted file
        const { iv, encrypted } = readOldEncryptedFile(oldEncPath);
        
        // Create backup
        const backupPath = path.join(ENCRYPTED_DIR, `${id}.enc.backup`);
        fs.copyFileSync(oldEncPath, backupPath);
        
        // Write new format file
        writeNewFormatFile(oldEncPath, metadata, iv, encrypted);
        
        // Delete JSON file and backup after successful migration
        fs.unlinkSync(jsonPath);
        fs.unlinkSync(backupPath);
        
        console.log(`  ✅ Migrated successfully\n`);
        migrated++;
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
        skipped++;
      }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log(`Migration complete!`);
    console.log(`✅ Migrated: ${migrated} file(s)`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped: ${skipped} file(s)`);
    }
    console.log("=".repeat(50));
    
  } catch (error) {
    console.error("❌ Migration error:", error);
  }
}

// Run migration
migrateFiles();
