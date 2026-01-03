# Batch Decrypt Script

A command-line tool to decrypt multiple encrypted images at once from the Secure Image Viewer application.

## Features

- ✅ Decrypt all images at once
- 📁 Support for albums (subdirectories)
- 🎯 Filter by specific album
- 📊 Detailed progress reporting
- 🔒 Preserves original filenames and metadata
- 📋 Summary report with success/failure counts

## Usage

### Basic Syntax

```bash
node batch-decrypt.js <decryption-key> [output-directory] [album-name]
```

### Parameters

1. **decryption-key** (required): The key used to encrypt the images
2. **output-directory** (optional): Where to save decrypted images (default: `./decrypted-output`)
3. **album-name** (optional): Decrypt only images from a specific album (default: all albums)

## Examples

### 1. Decrypt all images from all albums

```bash
node batch-decrypt.js mySecretKey123
```

This will:
- Decrypt all images from the `encrypted/` directory
- Decrypt all images from album subdirectories
- Save to `./decrypted-output/` maintaining album structure

### 2. Decrypt to a custom directory

```bash
node batch-decrypt.js mySecretKey123 ./my-decrypted-images
```

### 3. Decrypt only from default album (root)

```bash
node batch-decrypt.js mySecretKey123 ./output default
```

### 4. Decrypt only from a specific album

```bash
node batch-decrypt.js mySecretKey123 ./output vacation
```

This will only decrypt images from `encrypted/vacation/` folder.

## Output Structure

The script maintains the album structure in the output directory:

```
decrypted-output/
├── default/              # Images from root encrypted/ directory
│   ├── image1.jpg
│   └── image2.png
├── vacation/             # Images from encrypted/vacation/
│   ├── beach.jpg
│   └── sunset.jpg
└── work/                 # Images from encrypted/work/
    └── document.png
```

## Output Information

For each file, the script displays:
- ✅ Success/failure status
- 📝 Original and output filenames
- 📏 File size
- 🏷️ Tags (if available)

## Example Output

```
🔓 Batch Decryption Started
══════════════════════════════════════════════════
🔑 Using decryption key: myS***********
📂 Output directory: ./decrypted-output
📁 Processing all albums
📊 Found 5 encrypted file(s) in 2 album(s)

📁 Processing album: default
──────────────────────────────────────────────────
  ✅ abc123.enc → my-photo.jpg
     Size: 245.67 KB
     Tags: nature, sunset
  ✅ def456.enc → vacation.png
     Size: 512.34 KB

📁 Processing album: vacation
──────────────────────────────────────────────────
  ✅ ghi789.enc → beach.jpg
     Size: 389.12 KB
     Tags: beach, summer, travel

══════════════════════════════════════════════════
📊 Batch Decryption Summary
══════════════════════════════════════════════════
✅ Successfully decrypted: 3 file(s)
❌ Failed to decrypt: 0 file(s)
📂 Output location: ./decrypted-output

✨ Batch decryption completed!
```

## Error Handling

If decryption fails (e.g., wrong key), the script will:
- Continue processing other files
- Show which files failed
- Display a summary at the end

Example with errors:

```
  ❌ image.enc - Failed: Unsupported state or unable to authenticate data

⚠️  Failed files:
   - image.enc (default): Unsupported state or unable to authenticate data

💡 Tip: Make sure you are using the correct decryption key
```

## Notes

- The script uses the same encryption/decryption algorithm as the main application
- Original metadata (filename, tags, mime type) is preserved
- Files are sanitized for safe filesystem naming
- The script automatically determines file extensions from mime types
- Failed decryptions don't stop the process - other files continue

## Troubleshooting

### "Unsupported state or unable to authenticate data"
This usually means the decryption key is incorrect. Make sure you're using the exact key that was used to encrypt the images.

### "Album not found"
The specified album name doesn't exist in the `encrypted/` directory. Check available albums by listing directories in `encrypted/`.

### No files found
- Make sure the `encrypted/` directory exists
- Check that it contains `.enc` files
- Verify you're running the script from the correct directory

## Security Note

⚠️ **Important**: The decrypted images will be saved as plain files without encryption. Store them securely and delete them when no longer needed.
