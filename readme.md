# 🔐 Secure Image Viewer

A web application for encrypting and securely viewing images with password protection. Only users with the correct decryption key can view the images.

## ✨ Features

- **🔒 Image Encryption**: Upload and encrypt images with a secret key
- **🔓 On-Demand Decryption**: Images are only decrypted when viewed with the correct key
- **📱 Mobile Responsive**: Beautiful UI that works on all devices
- **🖼️ Gallery View**: Browse all your encrypted images in a clean grid layout
- **🗑️ Delete Images**: Remove encrypted images when no longer needed
- **🔐 AES-256 Encryption**: Industry-standard encryption for maximum security

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

### Encrypting an Image

1. Click on the **"Encrypt"** tab
2. Drag & drop an image or click to browse
3. (Optional) Enter a custom name for your image
4. Enter a secret encryption key (minimum 4 characters)
5. Confirm the key
6. Click **"🔒 Encrypt Image"**

### Viewing an Encrypted Image

1. Go to the **"Gallery"** tab
2. Click **"👁️ View"** on any encrypted image
3. Enter the decryption key you used when encrypting
4. Click **"🔓 Decrypt & View"**
5. The image will be displayed if the key is correct

### Managing Images

- **Refresh**: Click the 🔄 Refresh button to reload the gallery
- **Lock**: After viewing, click 🔒 Lock to hide the image again
- **Delete**: Click 🗑️ Delete to permanently remove an encrypted image

## 🔐 Security

- **AES-256-CBC Encryption**: All images are encrypted using AES-256 in CBC mode
- **Key Derivation**: Your password is hashed using SHA-256 for consistent key generation
- **No Plain Storage**: Original images are deleted immediately after encryption
- **Server-Side Decryption**: Decryption happens on the server, images are sent as base64

## � Project Structure

```
secure-image-viewer/
├── server.js           # Express server with API endpoints
├── package.json        # Dependencies and scripts
├── public/
│   ├── index.html      # Main HTML page
│   ├── app.js          # Frontend JavaScript
│   └── styles.css      # Responsive CSS styles
├── encrypted/          # Encrypted images storage (created automatically)
└── uploads/            # Temporary upload folder (created automatically)
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/encrypt` | Upload and encrypt an image |
| GET | `/api/images` | List all encrypted images |
| POST | `/api/decrypt/:id` | Decrypt and view an image |
| DELETE | `/api/images/:id` | Delete an encrypted image |

## 📱 Responsive Design

The application is fully responsive and works on:
- 📱 Mobile phones
- 📱 Tablets
- 💻 Desktops
- 🖥️ Large screens

## ⚠️ Important Notes

1. **Remember your keys!** There is no way to recover an image if you forget the encryption key
2. **Backup your encrypted files** in the `encrypted/` folder if you want to preserve them
3. **File size limit**: Maximum 50MB per image
4. **Supported formats**: JPEG, PNG, GIF, WebP, BMP

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Encryption**: Node.js Crypto (AES-256-CBC)
- **File Upload**: Multer
- **Frontend**: Vanilla JavaScript, CSS3
- **Fonts**: Google Fonts (Inter)

## 📄 License

ISC License
