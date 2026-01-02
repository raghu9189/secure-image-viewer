const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 3000;

// Ensure directories exist
const ENCRYPTED_DIR = path.join(__dirname, 'encrypted');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(ENCRYPTED_DIR)) fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ===== UUID Generator (replacing uuid library) =====
function generateUUID() {
  return crypto.randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

// ===== MIME Types =====
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ===== Encryption/Decryption Functions =====
function encryptFile(inputPath, outputPath, key, metadata) {
  const algorithm = 'aes-256-cbc';
  const keyHash = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);
  
  const input = fs.readFileSync(inputPath);
  const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
  
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  
  const metadataJson = JSON.stringify(metadata);
  const metadataBuffer = Buffer.from(metadataJson, 'utf8');
  const metadataLength = Buffer.alloc(4);
  metadataLength.writeUInt32BE(metadataBuffer.length, 0);
  
  const output = Buffer.concat([metadataLength, metadataBuffer, iv, encrypted]);
  fs.writeFileSync(outputPath, output);
  
  return true;
}

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
  
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  
  return { decrypted, metadata };
}

function readMetadata(filePath) {
  const fileContent = fs.readFileSync(filePath);
  const metadataLength = fileContent.readUInt32BE(0);
  const metadataBuffer = fileContent.subarray(4, 4 + metadataLength);
  return JSON.parse(metadataBuffer.toString('utf8'));
}

function updateMetadata(filePath, newMetadata) {
  const fileContent = fs.readFileSync(filePath);
  const oldMetadataLength = fileContent.readUInt32BE(0);
  
  const restOfFile = fileContent.subarray(4 + oldMetadataLength);
  
  const metadataJson = JSON.stringify(newMetadata);
  const metadataBuffer = Buffer.from(metadataJson, 'utf8');
  const metadataLength = Buffer.alloc(4);
  metadataLength.writeUInt32BE(metadataBuffer.length, 0);
  
  const output = Buffer.concat([metadataLength, metadataBuffer, restOfFile]);
  fs.writeFileSync(filePath, output);
}

// ===== Helper Functions =====
function findEncryptedFile(id) {
  const rootPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
  if (fs.existsSync(rootPath)) {
    return { path: rootPath, album: 'default' };
  }
  
  const albums = fs.readdirSync(ENCRYPTED_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const album of albums) {
    const albumPath = path.join(ENCRYPTED_DIR, album, `${id}.enc`);
    if (fs.existsSync(albumPath)) {
      return { path: albumPath, album };
    }
  }
  
  return null;
}

function sendJSON(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json)
  });
  res.end(json);
}

function sendError(res, statusCode, message) {
  console.error(`Error ${statusCode}:`, message);
  sendJSON(res, statusCode, { error: message });
}

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ===== Multipart Form Parser (replacing Multer) =====
function parseMultipartForm(req, callback) {
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return callback(new Error('Not a multipart form'));
  }
  
  const boundary = '--' + contentType.split('boundary=')[1];
  const chunks = [];
  
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const parts = [];
    let position = 0;
    
    while (position < buffer.length) {
      const boundaryIndex = buffer.indexOf(boundary, position);
      if (boundaryIndex === -1) break;
      
      const nextBoundaryIndex = buffer.indexOf(boundary, boundaryIndex + boundary.length);
      if (nextBoundaryIndex === -1) break;
      
      const partData = buffer.subarray(boundaryIndex + boundary.length, nextBoundaryIndex);
      
      const headerEndIndex = partData.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) {
        position = nextBoundaryIndex;
        continue;
      }
      
      const headerSection = partData.subarray(0, headerEndIndex).toString();
      const contentSection = partData.subarray(headerEndIndex + 4, partData.length - 2);
      
      const nameMatch = headerSection.match(/name="([^"]+)"/);
      const filenameMatch = headerSection.match(/filename="([^"]+)"/);
      const contentTypeMatch = headerSection.match(/Content-Type: (.+)/);
      
      if (nameMatch) {
        const part = {
          name: nameMatch[1],
          data: contentSection
        };
        
        if (filenameMatch) {
          part.filename = filenameMatch[1];
          part.contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
        } else {
          part.value = contentSection.toString('utf8');
        }
        
        parts.push(part);
      }
      
      position = nextBoundaryIndex;
    }
    
    callback(null, parts);
  });
}

function parseJSON(req, callback) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks).toString();
      if (!body || body.trim() === '') {
        callback(new Error('Empty body'));
        return;
      }
      const parsed = JSON.parse(body);
      callback(null, parsed);
    } catch (err) {
      console.error('JSON parse error:', err.message);
      callback(err);
    }
  });
  req.on('error', (err) => {
    console.error('Request error:', err);
    callback(err);
  });
}

// ===== Request Handler =====
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  console.log(`${method} ${pathname}`); // Debug logging
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // ===== Static Files =====
  if (pathname === '/' || pathname === '/index.html') {
    serveStatic(path.join(PUBLIC_DIR, 'index.html'), res);
  }
  else if (pathname.startsWith('/') && !pathname.startsWith('/api/')) {
    const filePath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveStatic(filePath, res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
  
  // ===== API: Get all images =====
  else if (pathname === '/api/images' && method === 'GET') {
    try {
      const files = fs.readdirSync(ENCRYPTED_DIR)
        .filter(file => file.endsWith('.enc'));
      
      const images = files.map(file => {
        const id = file.replace('.enc', '');
        const filePath = path.join(ENCRYPTED_DIR, file);
        const metadata = readMetadata(filePath);
        const stats = fs.statSync(filePath);
        
        return {
          id,
          originalName: metadata.originalName,
          encryptedAt: metadata.uploadDate || metadata.encryptedAt || new Date().toISOString(),
          size: stats.size,
          tags: metadata.tags || [],
          album: 'default'
        };
      });
      
      sendJSON(res, 200, { images });
    } catch (error) {
      console.error('List images error:', error);
      sendError(res, 500, error.message);
    }
  }
  
  // ===== API: Get albums =====
  else if (pathname === '/api/albums' && method === 'GET') {
    try {
      const items = fs.readdirSync(ENCRYPTED_DIR, { withFileTypes: true });
      const rootFiles = items.filter(item => item.isFile() && item.name.endsWith('.enc'));
      
      const albums = [{
        name: 'default',
        imageCount: rootFiles.length
      }];
      
      const directories = items.filter(item => item.isDirectory());
      for (const dir of directories) {
        const albumPath = path.join(ENCRYPTED_DIR, dir.name);
        const albumFiles = fs.readdirSync(albumPath).filter(f => f.endsWith('.enc'));
        albums.push({
          name: dir.name,
          imageCount: albumFiles.length
        });
      }
      
      sendJSON(res, 200, { albums });
    } catch (error) {
      sendError(res, 500, error.message);
    }
  }
  
  // ===== API: Get album images =====
  else if (pathname.match(/^\/api\/albums\/([^/]+)\/images$/) && method === 'GET') {
    try {
      const albumName = decodeURIComponent(pathname.split('/')[3]);
      let albumPath;
      
      if (albumName === 'default') {
        albumPath = ENCRYPTED_DIR;
      } else {
        albumPath = path.join(ENCRYPTED_DIR, albumName);
      }
      
      if (!fs.existsSync(albumPath)) {
        sendError(res, 404, 'Album not found');
        return;
      }
      
      const files = fs.readdirSync(albumPath)
        .filter(file => file.endsWith('.enc'));
      
      const images = files.map(file => {
        const id = file.replace('.enc', '');
        const filePath = path.join(albumPath, file);
        const metadata = readMetadata(filePath);
        const stats = fs.statSync(filePath);
        
        return {
          id,
          originalName: metadata.originalName,
          encryptedAt: metadata.uploadDate || metadata.encryptedAt || new Date().toISOString(),
          size: stats.size,
          tags: metadata.tags || [],
          album: albumName
        };
      });
      
      sendJSON(res, 200, { images });
    } catch (error) {
      sendError(res, 500, error.message);
    }
  }
  
  // ===== API: Upload and encrypt =====
  else if (pathname === '/api/encrypt' && method === 'POST') {
    parseMultipartForm(req, (err, parts) => {
      if (err) {
        sendError(res, 400, err.message);
        return;
      }
      
      try {
        const imagePart = parts.find(p => p.name === 'image');
        const keyPart = parts.find(p => p.name === 'key');
        const namePart = parts.find(p => p.name === 'name');
        const tagsPart = parts.find(p => p.name === 'tags');
        
        if (!imagePart || !keyPart) {
          sendError(res, 400, 'Missing required fields');
          return;
        }
        
        const allowedTypes = /jpeg|jpg|png|gif|heif|webp|bmp/;
        const ext = path.extname(imagePart.filename).toLowerCase();
        if (!allowedTypes.test(ext.substring(1))) {
          sendError(res, 400, 'Only image files are allowed');
          return;
        }
        
        const tempFilename = `${generateUUID()}${ext}`;
        const tempPath = path.join(UPLOADS_DIR, tempFilename);
        fs.writeFileSync(tempPath, imagePart.data);
        
        const id = generateUUID();
        const encryptedPath = path.join(ENCRYPTED_DIR, `${id}.enc`);
        
        let tags = [];
        if (tagsPart && tagsPart.value) {
          try {
            tags = JSON.parse(tagsPart.value);
          } catch (e) {
            tags = [];
          }
        }
        
        const metadata = {
          id: id,
          originalName: namePart ? namePart.value : imagePart.filename,
          uploadDate: new Date().toISOString(),
          encryptedAt: new Date().toISOString(),
          mimeType: imagePart.contentType || 'image/jpeg',
          tags: tags
        };
        
        encryptFile(tempPath, encryptedPath, keyPart.value, metadata);
        fs.unlinkSync(tempPath);
        
        sendJSON(res, 200, {
          success: true,
          id,
          name: metadata.originalName
        });
      } catch (error) {
        sendError(res, 500, error.message);
      }
    });
  }
  
  // ===== API: Decrypt image =====
  else if (pathname.match(/^\/api\/decrypt\/([^/]+)$/) && method === 'POST') {
    const id = pathname.split('/')[3];
    console.log('Decrypt request for ID:', id);
    
    parseJSON(req, (err, body) => {
      if (err || !body.key) {
        console.error('Parse error or missing key');
        sendError(res, 400, 'Invalid request');
        return;
      }
      
      console.log('Decrypting with key length:', body.key.length);
      
      try {
        const fileLocation = findEncryptedFile(id);
        if (!fileLocation) {
          console.error('File not found:', id);
          sendError(res, 404, 'Image not found');
          return;
        }
        
        console.log('File found at:', fileLocation.path);
        
        const { decrypted, metadata } = decryptFile(fileLocation.path, body.key);
        
        console.log('Decryption successful, size:', decrypted.length);
        
        // Return as base64 data URL for frontend
        const mimeType = metadata.mimeType || 'image/jpeg';
        const base64 = decrypted.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        sendJSON(res, 200, {
          success: true,
          image: dataUrl,
          metadata
        });
      } catch (error) {
        console.error('Decrypt error:', error.message);
        sendError(res, 401, 'Invalid decryption key');
      }
    });
  }
  
  // ===== API: Get thumbnail =====
  else if (pathname.match(/^\/api\/thumbnail\/([^/]+)$/) && method === 'POST') {
    const id = pathname.split('/')[3];
    console.log('Thumbnail request for ID:', id);
    
    parseJSON(req, (err, body) => {
      if (err) {
        console.error('Parse error:', err.message);
        sendError(res, 400, 'Invalid request: ' + err.message);
        return;
      }
      
      if (!body || !body.key) {
        console.error('Missing key in body:', body);
        sendError(res, 400, 'Key is required');
        return;
      }
      
      console.log('Key received, length:', body.key.length);
      
      try {
        const fileLocation = findEncryptedFile(id);
        if (!fileLocation) {
          console.error('File not found:', id);
          sendError(res, 404, 'Image not found');
          return;
        }
        
        console.log('File found at:', fileLocation.path);
        
        const { decrypted, metadata } = decryptFile(fileLocation.path, body.key);
        metadata.album = fileLocation.album;
        
        console.log('Decryption successful, size:', decrypted.length);
        
        // Return as base64 data URL (will be blurred on client side)
        const mimeType = metadata.mimeType || 'image/jpeg';
        const base64 = decrypted.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        sendJSON(res, 200, {
          success: true,
          thumbnail: dataUrl,
          metadata
        });
      } catch (error) {
        console.error('Thumbnail error:', error.message, error.stack);
        sendError(res, 401, 'Invalid key');
      }
    });
  }
  
  // ===== API: Delete image =====
  else if (pathname.match(/^\/api\/images\/([^/]+)$/) && method === 'DELETE') {
    const id = pathname.split('/')[3];
    
    try {
      const fileLocation = findEncryptedFile(id);
      if (!fileLocation) {
        sendError(res, 404, 'Image not found');
        return;
      }
      
      fs.unlinkSync(fileLocation.path);
      sendJSON(res, 200, { success: true });
    } catch (error) {
      sendError(res, 500, error.message);
    }
  }
  
  // ===== API: Update tags =====
  else if (pathname.match(/^\/api\/images\/([^/]+)\/tags$/) && method === 'POST') {
    const id = pathname.split('/')[3];
    
    parseJSON(req, (err, body) => {
      if (err || !body.tags) {
        sendError(res, 400, 'Invalid request');
        return;
      }
      
      try {
        const fileLocation = findEncryptedFile(id);
        if (!fileLocation) {
          sendError(res, 404, 'Image not found');
          return;
        }
        
        const metadata = readMetadata(fileLocation.path);
        metadata.tags = body.tags;
        updateMetadata(fileLocation.path, metadata);
        
        sendJSON(res, 200, { success: true, tags: metadata.tags });
      } catch (error) {
        sendError(res, 500, error.message);
      }
    });
  }
  
  // ===== Not Found =====
  else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🔐 Secure Image Viewer (Zero Dependencies) running on http://localhost:${PORT}`);
});
