# 🔐 Secure Image Viewer

A modern, feature-rich web application for encrypting and securely viewing images with password protection. Built with security, usability, and aesthetics in mind.

## ✨ Features

### 🔒 Security & Encryption
- **AES-256-CBC Encryption**: Industry-standard encryption for maximum security
- **Session Key Management**: Set a master key for seamless encryption/decryption
- **Secure Storage**: Original images are deleted immediately after encryption
- **Server-Side Decryption**: Decryption happens server-side for added security

### 🎨 User Interface
- **Instagram-Style Grid**: Beautiful 3-column grid layout (1 column on mobile)
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Smooth Animations**: Polished hover effects and transitions

### 🖼️ Image Management
- **Image Compression**: Optional 70% JPEG compression to reduce file size
- **Tag System**: Organize images with comma-separated tags
- **Search by Tags**: Powerful tag-based search with real-time filtering
- **Pagination**: Browse through large collections efficiently (10 images per page)
- **Thumbnail Previews**: Blurred thumbnails when session key is active

### 👁️ Image Viewing
- **Image Carousel**: Navigate through images with arrow keys or buttons
- **Zoom & Pan**: Zoom in/out and pan around images (pinch zoom on mobile)
- **Touch Gestures**: Swipe left/right to navigate on mobile devices
- **Full-Screen Viewing**: Immersive image viewing experience

### 📥 Download & Export
- **One-Click Download**: Download decrypted images (requires session key)
- **Original Filename**: Downloads maintain original image names
- **Grid & Modal Download**: Download from gallery or viewer modal

### ⚙️ Advanced Features
- **Options Modal**: Dedicated modal for image management (tags, lock, delete)
- **Batch Encryption**: Encrypt multiple images at once from a directory
- **Page Jump**: Quickly jump to any page in the gallery
- **Auto-Decrypt**: Automatic decryption when session key is set

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- npm or yarn

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd secure-image-viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and visit:
   ```
   http://localhost:3000
   ```

## 📖 How to Use

### Setting Up Session Key (Optional but Recommended)

1. Click the **🔑 Session Key** button in the header
2. Enter a master key (minimum 4 characters)
3. Click **"Set Session Key"**
4. This key will be used for all encryption/decryption operations
5. You can clear or update it anytime

**Benefits:**
- No need to enter keys for each operation
- Enable thumbnail previews
- Enable download functionality
- Faster workflow

### Encrypting an Image

1. Click on the **"Encrypt"** tab
2. Drag & drop an image or click to browse
3. (Optional) Enter a custom name for your image
4. (Optional) Add tags separated by commas (e.g., `vacation, beach, 2024`)
5. (Optional) Enable/disable compression (70% JPEG quality)
6. Enter encryption key (or use session key if set)
7. Click **"🔒 Encrypt Image"**

### Viewing an Encrypted Image

1. Go to the **"Gallery"** tab
2. Click **"👁️ View"** on any encrypted image
3. If no session key: Enter the decryption key
4. Image will decrypt automatically with session key
5. Use zoom controls, carousel navigation, or download

**Viewer Controls:**
- **Zoom In/Out**: Click + / - buttons or use mouse wheel
- **Pan**: Click and drag when zoomed in
- **Next/Previous**: Arrow keys or click carousel buttons
- **Download**: Click 📥 Download button (session key required)
- **Close**: Click X or press Escape key

### Managing Images

#### From Gallery View:
- **Options (⋮)**: Opens management modal for that image
- **Download (📥)**: Downloads the image (session key required)
- **View (👁️)**: Opens the image viewer

#### From Options Modal:
- **Edit Tags**: Update image tags in real-time
- **Lock Image**: Lock currently decrypted image
- **Delete Image**: Permanently remove the encrypted image

### Searching Images

1. Use the search bar in the Gallery tab
2. Enter tag names (comma-separated for multiple tags)
3. Results filter in real-time
4. Click **✕** to clear search

### Organizing with Tags

- Add tags during encryption: `nature, sunset, mountains`
- Edit tags later via Options modal (⋮)
- Search by any tag to find related images
- Tags are case-insensitive
- Up to 3 tags shown on cards, rest indicated with "+X"

## 🔐 Security

- **AES-256-CBC Encryption**: All images are encrypted using AES-256 in CBC mode
- **Key Derivation**: Passwords are hashed using SHA-256 for consistent key generation
- **No Plain Storage**: Original images are deleted immediately after encryption
- **Server-Side Decryption**: Decryption happens on the server with base64 encoding
- **Single File Format**: Each encrypted image is stored as a single `.enc` file
- **Session Key Storage**: Session keys are stored only in browser memory (not persisted)
- **Metadata Encryption**: Image metadata (name, tags, size) is encrypted alongside the image data

## 📦 File Format

Each encrypted file (`.enc`) contains:
1. **Metadata Length** (4 bytes): Size of the metadata JSON
2. **Metadata** (variable): Encrypted JSON with filename, mime type, size, tags, encryption date
3. **IV** (16 bytes): Initialization vector for AES encryption
4. **Encrypted Data** (variable): The actual encrypted image data

This single-file format eliminates the need for separate `.json` metadata files.

### Tag System

Tags are stored encrypted within the metadata:
```json
{
  "originalName": "vacation.jpg",
  "mimeType": "image/jpeg",
  "size": 524288,
  "encryptedAt": "2026-01-02T10:30:00.000Z",
  "tags": ["vacation", "beach", "summer"]
}
```

To update tags, you must have the session key active for re-encryption.

### Migrating from Old Format

If you have existing encrypted files in the old format (separate `.enc` and `.json` files), run the migration script:

```bash
npm run migrate
# or
node migrate-files.js
```

This will automatically convert all old format files to the new single-file format.

## 📦 Batch Encryption

You can encrypt multiple images from a directory at once using the batch encryption script:

```bash
npm run batch-encrypt
# or
node batch-encrypt.js
```

**Features:**
- Encrypt all images from a specified directory
- Optional recursive scanning of subdirectories
- Single encryption key for all images
- Custom name prefix for batch naming
- Detailed progress reporting
- Optional JSON report generation

**Interactive prompts:**
1. Enter the source directory path
2. Choose whether to scan subdirectories recursively
3. Review the list of found images
4. Enter and confirm encryption key
5. Optionally set a custom name prefix
6. Confirm and start encryption

**Supported formats:** JPEG, PNG, GIF, WebP, BMP, HEIF/HEIC

**Example workflow:**
```bash
$ node batch-encrypt.js
Enter source directory path: /Users/john/Pictures/vacation
Scan subdirectories recursively? (y/n) [n]: y
Found 15 image(s)
Enter encryption key: ********
✅ Successfully encrypted: 15 file(s)
```


## 📁 Project Structure

```
secure-image-viewer/
├── server.js              # Express server with encryption/decryption logic
├── package.json           # Dependencies and npm scripts
├── readme.md              # This file
├── batch-encrypt.js       # Batch encryption utility
├── migrate-files.js       # Migration script for old format
├── public/
│   ├── index.html         # Main HTML with modals and UI structure
│   ├── app.js             # Frontend JavaScript (1600+ lines)
│   └── styles.css         # Responsive CSS with dark mode (1800+ lines)
├── encrypted/             # Encrypted images storage (auto-created)
└── uploads/               # Temporary upload folder (auto-created)
```

### Frontend Architecture

**Key Components:**
- **Gallery View**: Instagram-style grid with pagination
- **Viewer Modal**: Full-screen image viewer with zoom/pan
- **Options Modal**: Manage tags, lock, delete
- **Session Key Modal**: Set/update/remove master key
- **Encrypt Form**: Upload and encrypt with compression

**State Management:**
- Session key (memory only)
- Current image and index
- Pagination (10 per page)
- Search/filter state
- Zoom/pan state
- Theme preference (localStorage)

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/encrypt` | Upload and encrypt an image with optional tags |
| GET | `/api/images` | List all encrypted images with metadata |
| POST | `/api/decrypt/:id` | Decrypt and view an image (returns base64) |
| POST | `/api/thumbnail/:id` | Generate blurred thumbnail preview |
| POST | `/api/images/:id/tags` | Update tags for an encrypted image |
| DELETE | `/api/images/:id` | Delete an encrypted image permanently |

### Example API Usage

**Encrypt an image:**
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('key', 'your-secret-key');
formData.append('name', 'My Image');
formData.append('tags', JSON.stringify(['nature', 'mountains']));

fetch('/api/encrypt', {
  method: 'POST',
  body: formData
});
```

**Update tags:**
```javascript
fetch('/api/images/image-id/tags', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    key: 'your-secret-key',
    tags: ['updated', 'tags'] 
  })
});
```

## 📱 Responsive Design

The application is fully responsive with breakpoints for:
- 📱 **Mobile** (< 640px): Single column grid, touch gestures, mobile-optimized modals
- 📱 **Tablet** (640px - 1024px): 2-3 column grid, tablet-friendly navigation
- 💻 **Desktop** (> 1024px): 3 column grid, hover effects, keyboard shortcuts
- 🖥️ **Large screens**: Max-width 935px (Instagram-inspired)

### Mobile Features:
- Swipe left/right to navigate images
- Pinch to zoom
- Touch and drag to pan
- Optimized button sizes for touch
- Responsive modals and forms

### Keyboard Shortcuts:
- `←` / `→` : Navigate between images
- `Escape` : Close modals
- `Enter` : Submit forms/decrypt
- Mouse wheel : Zoom in/out

## ⚠️ Important Notes

1. **Remember your keys!** There is no way to recover images if you forget the encryption key
2. **Session keys are temporary**: Stored only in memory, cleared on page refresh
3. **Backup encrypted files**: The `encrypted/` folder contains all your data
4. **File size limit**: Maximum 50MB per image
5. **Supported formats**: JPEG, PNG, GIF, WebP, BMP, HEIF/HEIC
6. **Compression**: 70% JPEG quality reduces file size by ~30-70%
7. **Tags require session key**: To edit tags, you must have the session key active
8. **Download requires session key**: Download feature only works when session key is set

## 💡 Pro Tips

1. **Use Session Key**: Set a session key for the best experience
2. **Tag Everything**: Use tags to organize and find images quickly
3. **Enable Compression**: Save storage space with minimal quality loss
4. **Batch Encrypt**: Use the batch script for encrypting multiple images
5. **Keyboard Navigation**: Use arrow keys to quickly browse images
6. **Search Smart**: Use comma-separated tags for multi-tag search
7. **Thumbnail Toggle**: Hide thumbnails if you want pure security (🔒 icon)

## 🎨 UI Features

- **Instagram-style grid**: Square aspect ratio, minimal gaps
- **Smooth animations**: Fade-in effects, hover states, transitions
- **Dark mode**: Toggle between light and dark themes
- **Color-coded buttons**: 
  - Blue (📥): Download
  - Gray (⋮): Options
  - Primary: View/Decrypt
  - Secondary: Cancel/Lock
  - Danger: Delete
- **Toast notifications**: Real-time feedback for all actions
- **Loading states**: Visual indicators during encryption/decryption

## 🛠️ Technologies Used

- **Backend**: 
  - Node.js & Express.js
  - Multer (file upload handling)
  - Node.js Crypto (AES-256-CBC encryption)
  - UUID (unique file identifiers)
  
- **Frontend**: 
  - Vanilla JavaScript (ES6+)
  - CSS3 (Grid, Flexbox, Custom Properties)
  - HTML5 (Canvas API for compression)
  
- **Features**:
  - Image compression using Canvas API
  - Base64 encoding for image transfer
  - LocalStorage for theme and preferences
  - Touch events for mobile gestures
  - Intersection Observer (potential use)
  
- **Fonts**: Google Fonts (Inter)

## 🚧 Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Start server with nodemon (auto-reload)
npm run dev

# Start server normally
npm start
```

### Code Structure

**Backend (server.js):**
- Express server setup
- Multer configuration
- Encryption/decryption functions
- API endpoints for all operations
- Thumbnail generation with blur effect

**Frontend (app.js):**
- State management
- DOM manipulation
- Event handlers
- API communication
- Image compression
- Zoom/pan logic
- Carousel navigation
- Tag management

**Styling (styles.css):**
- CSS custom properties (variables)
- Dark/light theme support
- Responsive breakpoints
- Instagram-inspired grid
- Modal and overlay styles
- Animation and transitions

## 🐛 Troubleshooting

**Images not showing in gallery:**
- Check if `encrypted/` folder exists
- Verify files have `.enc` extension
- Try refreshing the gallery

**Can't decrypt images:**
- Ensure you're using the correct key
- Check if session key is active (if used)
- Verify the file hasn't been corrupted

**Thumbnails not loading:**
- Thumbnails require active session key
- Toggle thumbnail visibility with 🖼️ button
- Check browser console for errors

**Download not working:**
- Download requires active session key
- Check browser's download settings
- Verify image was decrypted successfully

**Tags not updating:**
- Tags require active session key for encryption
- Ensure you click "Save Tags" button
- Refresh gallery to see changes

## 🔄 Future Enhancements

Potential features for future versions:
- [ ] Multiple encryption algorithms
- [ ] Shared galleries with password
- [ ] Image collections/albums
- [ ] Advanced search filters
- [ ] Export/import encrypted archives
- [ ] Cloud storage integration
- [ ] Multi-user support
- [ ] Image metadata preservation (EXIF)
- [ ] Video encryption support
- [ ] PWA (Progressive Web App) support

## 📄 License

ISC License

---

**Made with ❤️ and 🔐 for secure image storage**
