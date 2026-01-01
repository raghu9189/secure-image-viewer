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

// Encryption function
function encryptFile(inputPath, outputPath, key) {
  const algorithm = "aes-256-cbc";
  const keyHash = crypto.createHash("sha256").update(key).digest();
  const iv = crypto.randomBytes(16);
  
  const input = fs.readFileSync(inputPath);
  const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
  
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  
  // Store IV at the beginning of the file
  const output = Buffer.concat([iv, encrypted]);
  fs.writeFileSync(outputPath, output);
  
  return true;
}

// Decryption function
function decryptFile(inputPath, key) {
  const algorithm = "aes-256-cbc";
  const keyHash = crypto.createHash("sha256").update(key).digest();
  
  const fileContent = fs.readFileSync(inputPath);
  
  // Extract IV from the beginning (first 16 bytes)
  const iv = fileContent.subarray(0, 16);
  const encrypted = fileContent.subarray(16);
  
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  
  return decrypted;
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
    const encryptedFilename = `${uuidv4()}.enc`;
    const encryptedPath = path.join(ENCRYPTED_DIR, encryptedFilename);
    
    // Encrypt the file
    encryptFile(req.file.path, encryptedPath, key);
    
    // Store metadata
    const metadata = {
      id: encryptedFilename.replace(".enc", ""),
      originalName: originalName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedAt: new Date().toISOString()
    };
    
    const metadataPath = path.join(ENCRYPTED_DIR, `${metadata.id}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
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
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const content = fs.readFileSync(path.join(ENCRYPTED_DIR, f), "utf-8");
        return JSON.parse(content);
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
    const metadataPath = path.join(ENCRYPTED_DIR, `${id}.json`);
    
    if (!fs.existsSync(encryptedPath) || !fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    
    try {
      const decrypted = decryptFile(encryptedPath, key);
      
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

// Delete encrypted image
app.delete("/api/images/:id", (req, res) => {
  try {
    const { id } = req.params;
    const encryptedPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
    const metadataPath = path.join(ENCRYPTED_DIR, `${id}.json`);
    
    if (fs.existsSync(encryptedPath)) fs.unlinkSync(encryptedPath);
    if (fs.existsSync(metadataPath)) fs.unlinkSync(metadataPath);
    
    res.json({ success: true, message: "Image deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

app.listen(PORT, () =>
  console.log(`� Secure Image Viewer running on http://localhost:${PORT}`)
);
