const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Ensure directories exist
const ENCRYPTED_DIR = path.join(__dirname, "encrypted");
const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(ENCRYPTED_DIR)) fs.mkdirSync(ENCRYPTED_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|heif|webp|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Encryption function - stores metadata + encrypted data in one file
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

// Decryption function - extracts metadata and decrypts data from single file
function decryptFile(inputPath, key) {
  const algorithm = "aes-256-cbc";
  const keyHash = crypto.createHash("sha256").update(key).digest();
  
  const fileContent = fs.readFileSync(inputPath);
  
  // Extract metadata length (first 4 bytes)
  const metadataLength = fileContent.readUInt32BE(0);
  
  // Extract metadata
  const metadataBuffer = fileContent.subarray(4, 4 + metadataLength);
  const metadata = JSON.parse(metadataBuffer.toString('utf8'));
  
  // Initialize tags array if it doesn't exist (for old encrypted images)
  if (!metadata.tags) {
    metadata.tags = [];
  }
  
  // Extract IV (16 bytes after metadata)
  const ivStart = 4 + metadataLength;
  const iv = fileContent.subarray(ivStart, ivStart + 16);
  
  // Extract encrypted data
  const encrypted = fileContent.subarray(ivStart + 16);
  
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  
  return { decrypted, metadata };
}

// Read metadata from encrypted file without decrypting
function readMetadata(inputPath) {
  const fileContent = fs.readFileSync(inputPath);
  
  // Extract metadata length (first 4 bytes)
  const metadataLength = fileContent.readUInt32BE(0);
  
  // Extract and parse metadata
  const metadataBuffer = fileContent.subarray(4, 4 + metadataLength);
  const metadata = JSON.parse(metadataBuffer.toString('utf8'));
  
  // Initialize tags array if it doesn't exist (for old encrypted images)
  if (!metadata.tags) {
    metadata.tags = [];
  }
  
  return metadata;
}

// API Routes

// Upload and encrypt image
app.post("/api/encrypt", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const { key, name } = req.body;
    if (!key || key.length < 4) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Encryption key must be at least 4 characters" });
    }
    
    const originalName = name || req.file.originalname;
    const fileId = uuidv4();
    const encryptedFilename = `${fileId}.enc`;
    const encryptedPath = path.join(ENCRYPTED_DIR, encryptedFilename);
    
    // Prepare metadata
    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const metadata = {
      id: fileId,
      originalName: originalName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedAt: new Date().toISOString(),
      tags: tags
    };
    
    // Encrypt the file with metadata embedded
    encryptFile(req.file.path, encryptedPath, key, metadata);
    
    // Delete original uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      message: "Image encrypted successfully",
      image: metadata
    });
  } catch (error) {
    console.error("Encryption error:", error);
    res.status(500).json({ error: "Failed to encrypt image" });
  }
});

// Get list of encrypted images
app.get("/api/images", (req, res) => {
  try {
    const files = fs.readdirSync(ENCRYPTED_DIR);
    const images = files
      .filter(f => f.endsWith(".enc"))
      .map(f => {
        const filePath = path.join(ENCRYPTED_DIR, f);
        return readMetadata(filePath);
      })
      .sort((a, b) => new Date(b.encryptedAt) - new Date(a.encryptedAt));
    
    res.json({ images });
  } catch (error) {
    console.error("List error:", error);
    res.status(500).json({ error: "Failed to list images" });
  }
});

// Decrypt and view image
app.post("/api/decrypt/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "Decryption key is required" });
    }
    
    const encryptedPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
    
    if (!fs.existsSync(encryptedPath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    try {
      const { decrypted, metadata } = decryptFile(encryptedPath, key);
      
      // Return as base64 data URL
      const base64 = decrypted.toString("base64");
      const dataUrl = `data:${metadata.mimeType};base64,${base64}`;
      
      res.json({ 
        success: true, 
        image: dataUrl,
        metadata
      });
    } catch (decryptError) {
      res.status(401).json({ error: "Invalid decryption key" });
    }
  } catch (error) {
    console.error("Decryption error:", error);
    res.status(500).json({ error: "Failed to decrypt image" });
  }
});

// Get blurred thumbnail (only with valid key)
app.post("/api/thumbnail/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "Key is required for thumbnail" });
    }
    
    const encryptedPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
    
    if (!fs.existsSync(encryptedPath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    try {
      const { decrypted, metadata } = decryptFile(encryptedPath, key);
      
      // Return as base64 data URL (will be blurred on client side)
      const base64 = decrypted.toString("base64");
      const dataUrl = `data:${metadata.mimeType};base64,${base64}`;
      
      res.json({ 
        success: true, 
        thumbnail: dataUrl,
        metadata
      });
    } catch (decryptError) {
      res.status(401).json({ error: "Invalid key" });
    }
  } catch (error) {
    console.error("Thumbnail error:", error);
    res.status(500).json({ error: "Failed to generate thumbnail" });
  }
});

// Delete encrypted image
app.delete("/api/images/:id", (req, res) => {
  try {
    const { id } = req.params;
    const encryptedPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
    
    if (fs.existsSync(encryptedPath)) {
      fs.unlinkSync(encryptedPath);
    }
    
    res.json({ success: true, message: "Image deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Update tags for an image
app.post("/api/images/:id/tags", (req, res) => {
  try {
    const { id } = req.params;
    const { key, tags } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: "Key is required to update tags" });
    }
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }
    
    const encryptedPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
    
    if (!fs.existsSync(encryptedPath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    try {
      // Decrypt the file to verify key and get data
      const { decrypted, metadata } = decryptFile(encryptedPath, key);
      
      // Update metadata with new tags
      const updatedMetadata = {
        ...metadata,
        tags: tags,
        updatedAt: new Date().toISOString()
      };
      
      // Re-encrypt with updated metadata
      const tempPath = encryptedPath + '.tmp';
      const tempDecryptedPath = path.join(UPLOADS_DIR, `${id}.tmp`);
      
      // Write decrypted data temporarily
      fs.writeFileSync(tempDecryptedPath, decrypted);
      
      // Encrypt with new metadata
      encryptFile(tempDecryptedPath, tempPath, key, updatedMetadata);
      
      // Replace old file with new one
      fs.unlinkSync(encryptedPath);
      fs.renameSync(tempPath, encryptedPath);
      fs.unlinkSync(tempDecryptedPath);
      
      res.json({ 
        success: true, 
        message: "Tags updated successfully",
        metadata: updatedMetadata
      });
    } catch (decryptError) {
      res.status(401).json({ error: "Invalid key" });
    }
  } catch (error) {
    console.error("Update tags error:", error);
    res.status(500).json({ error: "Failed to update tags" });
  }
});

app.listen(PORT, () =>
  console.log(`🔐 Secure Image Viewer running on http://localhost:${PORT}`)
);
