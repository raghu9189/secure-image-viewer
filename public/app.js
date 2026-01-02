// ===== Secure Image Viewer App =====

// State
let images = [];
let filteredImages = []; // For search/filter results
let currentImage = null;
let currentImageIndex = -1;
let selectedFile = null;
let sessionKey = null; // Session-wide encryption/decryption key
let showThumbnails = true; // Thumbnail preview toggle state
let searchQuery = ''; // Current search query
let allTags = []; // All available tags across images

// Pagination state
let currentPage = 1;
const imagesPerPage = 10;

// DOM Elements
const elements = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  // Gallery
  imageGrid: document.getElementById('imageGrid'),
  emptyState: document.getElementById('emptyState'),
  refreshBtn: document.getElementById('refreshBtn'),
  
  // Search
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  searchResultsInfo: document.getElementById('searchResultsInfo'),
  
  // Pagination
  pagination: document.getElementById('pagination'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  pageInfo: document.getElementById('pageInfo'),
  totalImages: document.getElementById('totalImages'),
  pageJumpBtn: document.getElementById('pageJumpBtn'),
  pageJumpModal: document.getElementById('pageJumpModal'),
  pageJumpInput: document.getElementById('pageJumpInput'),
  pageJumpGo: document.getElementById('pageJumpGo'),
  closePageJump: document.getElementById('closePageJump'),
  
  // Encrypt Form
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  preview: document.getElementById('preview'),
  previewImg: document.getElementById('previewImg'),
  removeBtn: document.getElementById('removeBtn'),
  encryptForm: document.getElementById('encryptForm'),
  imageName: document.getElementById('imageName'),
  imageTagsInput: document.getElementById('imageTagsInput'),
  tagSuggestions: document.getElementById('tagSuggestions'),
  compressionToggle: document.getElementById('compressionToggle'),
  encryptKey: document.getElementById('encryptKey'),
  confirmKey: document.getElementById('confirmKey'),
  encryptBtn: document.getElementById('encryptBtn'),
  encryptKeyGroup: document.getElementById('encryptKeyGroup'),
  confirmKeyGroup: document.getElementById('confirmKeyGroup'),
  encryptSessionNotice: document.getElementById('encryptSessionNotice'),
  
  // Modal
  viewerModal: document.getElementById('viewerModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModal: document.getElementById('closeModal'),
  decryptForm: document.getElementById('decryptForm'),
  decryptKey: document.getElementById('decryptKey'),
  decryptKeyGroup: document.getElementById('decryptKeyGroup'),
  decryptSessionNotice: document.getElementById('decryptSessionNotice'),
  decryptBtn: document.getElementById('decryptBtn'),
  decryptError: document.getElementById('decryptError'),
  imageView: document.getElementById('imageView'),
  imageContainer: document.getElementById('imageContainer'),
  decryptedImage: document.getElementById('decryptedImage'),
  downloadBtn: document.getElementById('downloadBtn'),
  
  // Zoom controls
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomResetBtn: document.getElementById('zoomResetBtn'),
  zoomLevel: document.getElementById('zoomLevel'),
  
  // Carousel controls
  prevImageBtn: document.getElementById('prevImageBtn'),
  nextImageBtn: document.getElementById('nextImageBtn'),
  imageCounter: document.getElementById('imageCounter'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer'),
  
  // Theme
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  
  // Thumbnail Toggle
  thumbnailToggle: document.getElementById('thumbnailToggle'),
  thumbnailIcon: document.getElementById('thumbnailIcon'),
  
  // Session Key
  sessionKeyBtn: document.getElementById('sessionKeyBtn'),
  sessionKeyIcon: document.getElementById('sessionKeyIcon'),
  sessionKeyModal: document.getElementById('sessionKeyModal'),
  closeSessionModal: document.getElementById('closeSessionModal'),
  sessionKeyInput: document.getElementById('sessionKeyInput'),
  setSessionKey: document.getElementById('setSessionKey'),
  removeSessionKey: document.getElementById('removeSessionKey'),
  sessionStatus: document.getElementById('sessionStatus'),
  sessionBanner: document.getElementById('sessionBanner'),
  clearSessionKeyBtn: document.getElementById('clearSessionKeyBtn'),
  
  // Options Modal
  optionsModal: document.getElementById('optionsModal'),
  closeOptionsModal: document.getElementById('closeOptionsModal'),
  optionsModalTitle: document.getElementById('optionsModalTitle'),
  optionsImageTags: document.getElementById('optionsImageTags'),
  optionsTagEditContainer: document.getElementById('optionsTagEditContainer'),
  optionsTagEditInput: document.getElementById('optionsTagEditInput'),
  optionsSaveTagsBtn: document.getElementById('optionsSaveTagsBtn'),
  optionsLockBtn: document.getElementById('optionsLockBtn'),
  optionsDeleteBtn: document.getElementById('optionsDeleteBtn')
};

// ===== Theme Management =====
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

elements.themeToggle.addEventListener('click', toggleTheme);

// ===== Thumbnail Preview Toggle =====
function initThumbnailToggle() {
  const savedPref = localStorage.getItem('showThumbnails');
  showThumbnails = savedPref === null ? true : savedPref === 'true';
  updateThumbnailToggleUI();
}

function updateThumbnailToggleUI() {
  if (elements.thumbnailIcon) {
    elements.thumbnailIcon.textContent = showThumbnails ? '🖼️' : '🔒';
    elements.thumbnailToggle.title = showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails';
    elements.thumbnailToggle.classList.toggle('active', showThumbnails);
  }
}

function toggleThumbnails() {
  showThumbnails = !showThumbnails;
  localStorage.setItem('showThumbnails', showThumbnails);
  updateThumbnailToggleUI();
  
  // Reload gallery to apply changes
  if (images.length > 0) {
    renderImages();
  }
  
  showToast(showThumbnails ? 'Thumbnails enabled' : 'Thumbnails disabled', 'info');
}

elements.thumbnailToggle.addEventListener('click', toggleThumbnails);

// ===== Image Zoom & Pan Management =====
let imageZoom = {
  scale: 1,
  minScale: 0.5,
  maxScale: 5,
  step: 0.25,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  lastTouchDistance: 0
};

function resetImageZoom() {
  imageZoom.scale = 1;
  imageZoom.translateX = 0;
  imageZoom.translateY = 0;
  imageZoom.isDragging = false;
  updateImageTransform();
}

function updateImageTransform() {
  const img = elements.decryptedImage;
  img.style.transform = `translate(${imageZoom.translateX}px, ${imageZoom.translateY}px) scale(${imageZoom.scale})`;
  elements.zoomLevel.textContent = `${Math.round(imageZoom.scale * 100)}%`;
  
  // Update button states
  elements.zoomInBtn.disabled = imageZoom.scale >= imageZoom.maxScale;
  elements.zoomOutBtn.disabled = imageZoom.scale <= imageZoom.minScale;
}

function zoomIn() {
  if (imageZoom.scale < imageZoom.maxScale) {
    imageZoom.scale = Math.min(imageZoom.scale + imageZoom.step, imageZoom.maxScale);
    updateImageTransform();
  }
}

function zoomOut() {
  if (imageZoom.scale > imageZoom.minScale) {
    imageZoom.scale = Math.max(imageZoom.scale - imageZoom.step, imageZoom.minScale);
    
    // Adjust translation if needed to keep image visible
    const container = elements.imageContainer;
    const img = elements.decryptedImage;
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const maxTranslateX = Math.max(0, (imgRect.width * imageZoom.scale - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (imgRect.height * imageZoom.scale - containerRect.height) / 2);
    
    imageZoom.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, imageZoom.translateX));
    imageZoom.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, imageZoom.translateY));
    
    updateImageTransform();
  }
}

function zoomReset() {
  resetImageZoom();
}

// Mouse wheel zoom
function handleWheel(e) {
  if (!elements.imageView.classList.contains('hidden')) {
    e.preventDefault();
    
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }
}

// Touch pinch zoom
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handleTouchStart(e) {
  if (e.touches.length === 2) {
    // Pinch zoom
    imageZoom.lastTouchDistance = getTouchDistance(e.touches);
  } else if (e.touches.length === 1) {
    // Pan
    imageZoom.isDragging = true;
    imageZoom.startX = e.touches[0].clientX - imageZoom.translateX;
    imageZoom.startY = e.touches[0].clientY - imageZoom.translateY;
    elements.imageContainer.classList.add('dragging');
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  
  if (e.touches.length === 2) {
    // Pinch zoom
    const distance = getTouchDistance(e.touches);
    const delta = distance - imageZoom.lastTouchDistance;
    
    if (Math.abs(delta) > 5) {
      const zoomDelta = delta * 0.01;
      imageZoom.scale = Math.max(imageZoom.minScale, Math.min(imageZoom.maxScale, imageZoom.scale + zoomDelta));
      imageZoom.lastTouchDistance = distance;
      updateImageTransform();
    }
  } else if (e.touches.length === 1 && imageZoom.isDragging) {
    // Pan
    imageZoom.translateX = e.touches[0].clientX - imageZoom.startX;
    imageZoom.translateY = e.touches[0].clientY - imageZoom.startY;
    updateImageTransform();
  }
}

function handleTouchEnd(e) {
  if (e.touches.length < 2) {
    imageZoom.lastTouchDistance = 0;
  }
  if (e.touches.length === 0) {
    imageZoom.isDragging = false;
    elements.imageContainer.classList.remove('dragging');
  }
}

// Mouse drag
function handleMouseDown(e) {
  if (imageZoom.scale > 1) {
    imageZoom.isDragging = true;
    imageZoom.startX = e.clientX - imageZoom.translateX;
    imageZoom.startY = e.clientY - imageZoom.translateY;
    elements.imageContainer.classList.add('dragging');
  }
}

function handleMouseMove(e) {
  if (imageZoom.isDragging) {
    imageZoom.translateX = e.clientX - imageZoom.startX;
    imageZoom.translateY = e.clientY - imageZoom.startY;
    updateImageTransform();
  }
}

function handleMouseUp() {
  imageZoom.isDragging = false;
  elements.imageContainer.classList.remove('dragging');
}

// Zoom button events
elements.zoomInBtn.addEventListener('click', zoomIn);
elements.zoomOutBtn.addEventListener('click', zoomOut);
elements.zoomResetBtn.addEventListener('click', zoomReset);

// Wheel event for zoom
elements.imageView.addEventListener('wheel', handleWheel, { passive: false });

// Touch events for mobile
elements.imageContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
elements.imageContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
elements.imageContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

// Mouse events for desktop drag
elements.imageContainer.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

// Prevent context menu on long press
elements.imageContainer.addEventListener('contextmenu', (e) => {
  if (imageZoom.scale > 1) {
    e.preventDefault();
  }
});

// ===== Carousel Swipe Support =====
let carouselSwipe = {
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  isSwiping: false,
  minSwipeDistance: 50
};

function handleCarouselTouchStart(e) {
  // Only handle swipe when not zoomed
  if (imageZoom.scale > 1) return;
  
  carouselSwipe.startX = e.touches[0].clientX;
  carouselSwipe.startY = e.touches[0].clientY;
  carouselSwipe.isSwiping = true;
}

function handleCarouselTouchMove(e) {
  if (!carouselSwipe.isSwiping || imageZoom.scale > 1) return;
  
  carouselSwipe.endX = e.touches[0].clientX;
  carouselSwipe.endY = e.touches[0].clientY;
}

function handleCarouselTouchEnd(e) {
  if (!carouselSwipe.isSwiping || imageZoom.scale > 1) return;
  
  const deltaX = carouselSwipe.endX - carouselSwipe.startX;
  const deltaY = carouselSwipe.endY - carouselSwipe.startY;
  
  // Check if horizontal swipe is greater than vertical (to avoid conflicts with vertical scroll)
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > carouselSwipe.minSwipeDistance) {
    if (deltaX > 0) {
      // Swipe right - show previous
      showPreviousImage();
    } else {
      // Swipe left - show next
      showNextImage();
    }
  }
  
  carouselSwipe.isSwiping = false;
  carouselSwipe.startX = 0;
  carouselSwipe.startY = 0;
  carouselSwipe.endX = 0;
  carouselSwipe.endY = 0;
}

// Add swipe listeners to image view
elements.imageView.addEventListener('touchstart', handleCarouselTouchStart, { passive: true });
elements.imageView.addEventListener('touchmove', handleCarouselTouchMove, { passive: true });
elements.imageView.addEventListener('touchend', handleCarouselTouchEnd, { passive: true });

// ===== Session Key Management =====
function updateSessionKeyUI() {
  const hasSessionKey = !!sessionKey;
  
  // Update header icon
  elements.sessionKeyBtn.classList.toggle('active', hasSessionKey);
  elements.sessionKeyIcon.textContent = hasSessionKey ? '🔓' : '🔑';
  
  // Update banner
  elements.sessionBanner.classList.toggle('hidden', !hasSessionKey);
  
  // Show/hide thumbnail toggle button based on session key
  if (elements.thumbnailToggle) {
    elements.thumbnailToggle.style.display = hasSessionKey ? 'flex' : 'none';
  }
  
  // Update encrypt form
  elements.encryptKeyGroup.classList.toggle('hidden', hasSessionKey);
  elements.confirmKeyGroup.classList.toggle('hidden', hasSessionKey);
  elements.encryptSessionNotice.classList.toggle('hidden', !hasSessionKey);
  
  // Update required attributes
  elements.encryptKey.required = !hasSessionKey;
  elements.confirmKey.required = !hasSessionKey;
  
  // Update session modal
  elements.removeSessionKey.style.display = hasSessionKey ? 'block' : 'none';
  elements.setSessionKey.textContent = hasSessionKey ? 'Update Key' : 'Set Session Key';
  
  if (hasSessionKey) {
    elements.sessionStatus.className = 'session-status active';
    elements.sessionStatus.textContent = '✓ Session key is active';
  } else {
    elements.sessionStatus.className = 'session-status inactive';
    elements.sessionStatus.textContent = 'No session key set';
  }
  
  // Reload gallery to show/hide thumbnails
  if (images.length > 0) {
    renderImages();
  }
}

function openSessionKeyModal() {
  elements.sessionKeyModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  elements.sessionKeyInput.value = '';
  elements.sessionKeyInput.focus();
}

function closeSessionKeyModal() {
  elements.sessionKeyModal.classList.remove('show');
  document.body.style.overflow = '';
}

elements.sessionKeyBtn.addEventListener('click', openSessionKeyModal);
elements.closeSessionModal.addEventListener('click', closeSessionKeyModal);
elements.sessionKeyModal.querySelector('.modal-overlay').addEventListener('click', closeSessionKeyModal);

elements.setSessionKey.addEventListener('click', () => {
  const key = elements.sessionKeyInput.value;
  if (key.length < 4) {
    showToast('Session key must be at least 4 characters', 'error');
    return;
  }
  
  sessionKey = key;
  updateSessionKeyUI();
  closeSessionKeyModal();
  showToast('Session key set successfully!', 'success');
});

elements.removeSessionKey.addEventListener('click', () => {
  sessionKey = null;
  updateSessionKeyUI();
  closeSessionKeyModal();
  showToast('Session key removed', 'info');
});

elements.clearSessionKeyBtn.addEventListener('click', () => {
  sessionKey = null;
  updateSessionKeyUI();
  showToast('Session key cleared', 'info');
});

// Enter key in session input
elements.sessionKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    elements.setSessionKey.click();
  }
});

// ===== Tab Navigation =====
function switchTab(tabId) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
}

elements.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== File Handling =====
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) {
    showToast('File size must be less than 50MB', 'error');
    return;
  }
  
  selectedFile = file;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    elements.previewImg.src = e.target.result;
    elements.preview.classList.remove('hidden');
    elements.dropzone.querySelector('.dropzone-content').classList.add('hidden');
  };
  reader.readAsDataURL(file);
  
  // Set default name
  if (!elements.imageName.value) {
    elements.imageName.value = file.name.replace(/\.[^/.]+$/, '');
  }
}

// Dropzone events
elements.dropzone.addEventListener('click', () => {
  if (!selectedFile) elements.fileInput.click();
});

elements.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  elements.dropzone.classList.add('dragover');
});

elements.dropzone.addEventListener('dragleave', () => {
  elements.dropzone.classList.remove('dragover');
});

elements.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  elements.dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

elements.fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

elements.removeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  selectedFile = null;
  elements.fileInput.value = '';
  elements.previewImg.src = '';
  elements.preview.classList.add('hidden');
  elements.dropzone.querySelector('.dropzone-content').classList.remove('hidden');
});

// ===== Password Toggle =====
document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    const isPassword = target.type === 'password';
    target.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁️';
  });
});

// ===== Image Compression =====
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to image dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob with JPEG format at 70% quality
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a new File object from the blob
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            const originalSize = file.size;
            const compressedSize = compressedFile.size;
            const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            
            console.log('Compression results:', {
              original: (originalSize / 1024).toFixed(2) + ' KB',
              compressed: (compressedSize / 1024).toFixed(2) + ' KB',
              savings: savings + '%'
            });
            
            // Only use compressed version if it's actually smaller
            if (compressedSize < originalSize) {
              showToast(`Image compressed: ${savings}% smaller`, 'success');
              resolve(compressedFile);
            } else {
              showToast('Compression skipped: original is optimal', 'info');
              resolve(file);
            }
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', 0.7); // JPEG with 70% quality
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ===== Encrypt Form =====
elements.encryptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!selectedFile) {
    showToast('Please select an image to encrypt', 'error');
    return;
  }
  
  // Use session key if available, otherwise use form input
  const key = sessionKey || elements.encryptKey.value;
  const confirmKey = sessionKey || elements.confirmKey.value;
  
  if (!sessionKey) {
    if (key.length < 4) {
      showToast('Key must be at least 4 characters', 'error');
      return;
    }
    
    if (key !== confirmKey) {
      showToast('Keys do not match', 'error');
      return;
    }
  }
  
  // Show loading state
  elements.encryptBtn.disabled = true;
  elements.encryptBtn.querySelector('.btn-text').classList.add('hidden');
  elements.encryptBtn.querySelector('.btn-loading').classList.remove('hidden');
  
  try {
    // Compress image if toggle is enabled
    let fileToEncrypt = selectedFile;
    if (elements.compressionToggle.checked) {
      try {
        elements.encryptBtn.querySelector('.btn-loading').textContent = '⏳ Compressing...';
        fileToEncrypt = await compressImage(selectedFile);
      } catch (compressionError) {
        console.error('Compression error:', compressionError);
        showToast('Compression failed, using original image', 'warning');
        fileToEncrypt = selectedFile;
      }
    }
    
    elements.encryptBtn.querySelector('.btn-loading').textContent = '⏳ Encrypting...';
    
    const formData = new FormData();
    formData.append('image', fileToEncrypt);
    formData.append('key', key);
    formData.append('name', elements.imageName.value || selectedFile.name);
    
    // Add tags if provided
    const tags = parseTags(elements.imageTagsInput.value);
    formData.append('tags', JSON.stringify(tags));
    
    const response = await fetch('/api/encrypt', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Image encrypted successfully!', 'success');
      
      // Reset form
      selectedFile = null;
      elements.fileInput.value = '';
      elements.previewImg.src = '';
      elements.preview.classList.add('hidden');
      elements.dropzone.querySelector('.dropzone-content').classList.remove('hidden');
      elements.imageName.value = '';
      elements.imageTagsInput.value = '';
      elements.encryptKey.value = '';
      elements.confirmKey.value = '';
      
      // Switch to gallery and refresh
      switchTab('gallery');
      loadImages();
    } else {
      showToast(result.error || 'Encryption failed', 'error');
    }
  } catch (error) {
    console.error('Encryption error:', error);
    showToast('Failed to encrypt image', 'error');
  } finally {
    elements.encryptBtn.disabled = false;
    elements.encryptBtn.querySelector('.btn-text').classList.remove('hidden');
    elements.encryptBtn.querySelector('.btn-loading').classList.add('hidden');
    elements.encryptBtn.querySelector('.btn-loading').textContent = '⏳ Encrypting...';
  }
});

// ===== Tag Management =====

// Extract all unique tags from images
function extractAllTags() {
  const tagSet = new Set();
  images.forEach(img => {
    if (img.tags && Array.isArray(img.tags)) {
      img.tags.forEach(tag => tagSet.add(tag.toLowerCase()));
    }
  });
  allTags = Array.from(tagSet).sort();
  return allTags;
}

// Parse tags from input string (comma-separated)
function parseTags(input) {
  if (!input || typeof input !== 'string') return [];
  return input
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => tag.toLowerCase());
}

// Render tag badges
function renderTagBadges(tags, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!tags || tags.length === 0) {
    container.innerHTML = '<span class="no-tags">No tags</span>';
    return;
  }
  
  container.innerHTML = tags.map(tag => 
    `<span class="tag-badge">${tag}</span>`
  ).join('');
}

// Show tag suggestions
function showTagSuggestions(input, suggestionsElement) {
  if (!input || allTags.length === 0) {
    suggestionsElement.style.display = 'none';
    return;
  }
  
  const query = input.toLowerCase();
  const matches = allTags.filter(tag => tag.includes(query));
  
  if (matches.length === 0) {
    suggestionsElement.style.display = 'none';
    return;
  }
  
  suggestionsElement.innerHTML = matches.slice(0, 5).map(tag => 
    `<div class="tag-suggestion" onclick="selectSuggestion('${tag}')">${tag}</div>`
  ).join('');
  suggestionsElement.style.display = 'block';
}

// Select a tag suggestion
function selectSuggestion(tag) {
  const input = elements.imageTagsInput;
  const currentValue = input.value.trim();
  const tags = currentValue ? currentValue.split(',').map(t => t.trim()) : [];
  
  // Add tag if not already present
  if (!tags.includes(tag)) {
    tags.push(tag);
    input.value = tags.join(', ');
  }
  
  elements.tagSuggestions.style.display = 'none';
  input.focus();
}

// Update tags for an image
async function updateImageTags(imageId, tags) {
  console.log('updateImageTags called:', { imageId, tags, sessionKey: sessionKey ? 'exists' : 'missing' });
  
  if (!sessionKey) {
    showToast('Session key required to update tags', 'error');
    return false;
  }
  
  try {
    console.log('Sending request to:', `/api/images/${imageId}/tags`);
    console.log('Request body:', { key: '***', tags });
    
    const response = await fetch(`/api/images/${imageId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: sessionKey, tags })
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (response.ok) {
      // Update local image data
      const imgIndex = images.findIndex(img => img.id === imageId);
      if (imgIndex !== -1) {
        images[imgIndex].tags = tags;
        console.log('Updated local images array at index:', imgIndex);
      }
      
      // Update current image if it's the one being edited
      if (currentImage && currentImage.id === imageId) {
        currentImage.tags = tags;
        console.log('Updated currentImage.tags');
      }
      
      // Refresh tag list
      extractAllTags();
      
      showToast('Tags updated successfully', 'success');
      return true;
    } else {
      showToast(result.error || 'Failed to update tags', 'error');
      return false;
    }
  } catch (error) {
    console.error('Update tags error:', error);
    showToast('Failed to update tags', 'error');
    return false;
  }
}

// Search/filter images by tags ONLY
function searchImages(query) {
  searchQuery = query.toLowerCase().trim();
  
  if (!searchQuery) {
    clearSearch();
    return;
  }
  
  // Split search query into multiple tags (comma-separated)
  const searchTags = searchQuery.split(',').map(t => t.trim()).filter(t => t.length > 0);
  
  // Search ONLY in tags (not in image names)
  filteredImages = images.filter(img => {
    if (!img.tags || img.tags.length === 0) {
      return false; // No tags = no match
    }
    
    // Match if ANY search tag matches ANY image tag (partial match)
    return searchTags.some(searchTag => 
      img.tags.some(imageTag => 
        imageTag.toLowerCase().includes(searchTag)
      )
    );
  });
  
  // Reset to first page for search results
  currentPage = 1;
  renderImages();
  
  // Show search results info and clear button
  if (elements.searchResultsInfo) {
    if (filteredImages.length === 0) {
      elements.searchResultsInfo.textContent = `No images found with tag "${searchQuery}"`;
      elements.searchResultsInfo.style.display = 'block';
    } else {
      elements.searchResultsInfo.textContent = `Found ${filteredImages.length} image${filteredImages.length !== 1 ? 's' : ''} with tag "${searchQuery}"`;
      elements.searchResultsInfo.style.display = 'block';
    }
  }
  
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.classList.remove('hidden');
  }
}

// Clear search
function clearSearch() {
  searchQuery = '';
  filteredImages = [];
  elements.searchInput.value = '';
  
  if (elements.searchResultsInfo) {
    elements.searchResultsInfo.style.display = 'none';
  }
  
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.classList.add('hidden');
  }
  
  currentPage = 1;
  renderImages();
}

// ===== Load Images =====
async function loadImages() {
  try {
    const response = await fetch('/api/images');
    const result = await response.json();
    
    images = result.images || [];
    extractAllTags(); // Extract tags after loading images
    currentPage = 1; // Reset to first page
    clearSearch(); // Clear any active search
    renderImages();
  } catch (error) {
    console.error('Failed to load images:', error);
    showToast('Failed to load images', 'error');
  }
}

function renderImages() {
  // Use filtered images if search is active, otherwise use all images
  const displayImages = searchQuery ? filteredImages : images;
  
  if (displayImages.length === 0) {
    elements.imageGrid.innerHTML = '';
    if (searchQuery) {
      elements.emptyState.innerHTML = '<p>No images found matching your search.</p>';
    } else {
      elements.emptyState.innerHTML = '<p>No encrypted images yet. Upload and encrypt your first image!</p>';
    }
    elements.emptyState.classList.remove('hidden');
    elements.pagination.style.display = 'none';
    return;
  }
  
  elements.emptyState.classList.add('hidden');
  
  // Calculate pagination
  const totalPages = Math.ceil(displayImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const paginatedImages = displayImages.slice(startIndex, endIndex);
  
  // Render paginated images with tags
  elements.imageGrid.innerHTML = paginatedImages.map(img => `
    <div class="image-card" data-id="${img.id}">
      <div class="image-placeholder" id="placeholder-${img.id}">
        <span class="lock-emoji">🔒</span>
      </div>
      <div class="image-info">
        <h4 class="image-name" title="${img.originalName}">${img.originalName}</h4>
        <p class="image-meta">
          ${formatFileSize(img.size)} • ${formatDate(img.encryptedAt)}
        </p>
        ${img.tags && img.tags.length > 0 ? `
          <div class="image-tags-preview">
            ${img.tags.slice(0, 3).map(tag => `<span class="tag-badge-small">${tag}</span>`).join('')}
            ${img.tags.length > 3 ? `<span class="tag-more">+${img.tags.length - 3}</span>` : ''}
          </div>
        ` : ''}
      </div>
      <button class="btn-options" onclick="openOptionsModal('${img.id}')" title="Options">
        ⋮
      </button>
      ${sessionKey ? `
        <button class="btn-download" onclick="downloadImage('${img.id}')" title="Download">
          📥
        </button>
      ` : ''}
      <button class="btn btn-view" onclick="openViewer('${img.id}')">
        👁️ View
      </button>
    </div>
  `).join('');
  
  // Update pagination controls
  updatePaginationControls(totalPages, displayImages.length);
  
  // Load thumbnails if session key is set AND thumbnails are enabled
  if (sessionKey && showThumbnails) {
    loadThumbnails(paginatedImages);
  }
  
  // Scroll to top of gallery when page changes
  elements.imageGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updatePaginationControls(totalPages, totalCount) {
  if (totalPages <= 1) {
    elements.pagination.style.display = 'none';
    return;
  }
  
  elements.pagination.style.display = 'flex';
  elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  elements.totalImages.textContent = `${totalCount} image${totalCount !== 1 ? 's' : ''}`;
  
  // Update button states
  elements.prevPageBtn.disabled = currentPage === 1;
  elements.nextPageBtn.disabled = currentPage === totalPages;
}

function goToPage(page) {
  const displayImages = searchQuery ? filteredImages : images;
  const totalPages = Math.ceil(displayImages.length / imagesPerPage);
  
  if (page < 1 || page > totalPages) {
    return;
  }
  
  currentPage = page;
  renderImages();
}

function goToPreviousPage() {
  if (currentPage > 1) {
    goToPage(currentPage - 1);
  }
}

function goToNextPage() {
  const totalPages = Math.ceil(images.length / imagesPerPage);
  if (currentPage < totalPages) {
    goToPage(currentPage + 1);
  }
}

// Pagination event listeners
elements.prevPageBtn.addEventListener('click', goToPreviousPage);
elements.nextPageBtn.addEventListener('click', goToNextPage);

// ===== Page Jump =====
function openPageJump() {
  const totalPages = Math.ceil(images.length / imagesPerPage);
  elements.pageJumpInput.max = totalPages;
  elements.pageJumpInput.value = '';
  elements.pageJumpInput.placeholder = `Enter page (1-${totalPages})`;
  elements.pageJumpModal.classList.remove('hidden');
  setTimeout(() => elements.pageJumpInput.focus(), 100);
}

function closePageJump() {
  elements.pageJumpModal.classList.add('hidden');
  elements.pageJumpInput.value = '';
}

function jumpToPage() {
  const pageNumber = parseInt(elements.pageJumpInput.value);
  const totalPages = Math.ceil(images.length / imagesPerPage);
  
  if (!pageNumber || pageNumber < 1 || pageNumber > totalPages) {
    showToast(`Please enter a valid page number (1-${totalPages})`, 'error');
    return;
  }
  
  goToPage(pageNumber);
  closePageJump();
  showToast(`Jumped to page ${pageNumber}`, 'success');
}

// Page jump event listeners
elements.pageJumpBtn.addEventListener('click', openPageJump);
elements.closePageJump.addEventListener('click', closePageJump);
elements.pageJumpGo.addEventListener('click', jumpToPage);
elements.pageJumpInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    jumpToPage();
  }
});

// Close page jump modal on outside click
elements.pageJumpModal.addEventListener('click', (e) => {
  if (e.target === elements.pageJumpModal) {
    closePageJump();
  }
});

// Load blurred thumbnails for paginated images
async function loadThumbnails(imagesToLoad) {
  // Double check the toggle state
  if (!showThumbnails) return;
  
  // Use provided list or fall back to all images
  const imageList = imagesToLoad || images;
  
  for (const img of imageList) {
    try {
      const response = await fetch(`/api/thumbnail/${img.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: sessionKey })
      });
      
      if (response.ok) {
        const result = await response.json();
        const placeholder = document.getElementById(`placeholder-${img.id}`);
        if (placeholder) {
          placeholder.innerHTML = `<img src="${result.thumbnail}" alt="${img.originalName}" class="thumbnail-blur">`;
        }
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for ${img.id}:`, error);
    }
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

elements.refreshBtn.addEventListener('click', loadImages);

// ===== Carousel Navigation =====
function updateCarouselControls() {
  // Update counter
  if (elements.imageCounter) {
    elements.imageCounter.textContent = `${currentImageIndex + 1} / ${images.length}`;
  }
  
  // Update button states
  if (elements.prevImageBtn) {
    elements.prevImageBtn.disabled = currentImageIndex <= 0;
  }
  if (elements.nextImageBtn) {
    elements.nextImageBtn.disabled = currentImageIndex >= images.length - 1;
  }
}

function navigateToImage(direction) {
  const newIndex = currentImageIndex + direction;
  
  if (newIndex < 0 || newIndex >= images.length) {
    return;
  }
  
  currentImageIndex = newIndex;
  currentImage = images[currentImageIndex];
  
  // Update UI
  elements.modalTitle.textContent = currentImage.originalName;
  elements.decryptKey.value = '';
  elements.decryptError.classList.add('hidden');
  elements.decryptedImage.src = '';
  
  // Reset zoom
  resetImageZoom();
  
  // Check if image is already decrypted in view
  const isImageVisible = !elements.imageView.classList.contains('hidden');
  
  if (isImageVisible) {
    // If image view is visible, decrypt the new image
    elements.decryptForm.classList.add('hidden');
    elements.imageView.classList.remove('hidden');
    
    // Auto-decrypt with session key or show decrypt form
    if (sessionKey) {
      decryptImage();
    } else {
      // Show decrypt form for new image
      elements.decryptForm.classList.remove('hidden');
      elements.imageView.classList.add('hidden');
      elements.decryptKey.focus();
    }
  }
  
  updateCarouselControls();
}

function showPreviousImage() {
  navigateToImage(-1);
}

function showNextImage() {
  navigateToImage(1);
}

// Carousel button event listeners
if (elements.prevImageBtn) {
  elements.prevImageBtn.addEventListener('click', showPreviousImage);
}
if (elements.nextImageBtn) {
  elements.nextImageBtn.addEventListener('click', showNextImage);
}

// ===== Image Viewer Modal =====
function openViewer(id) {
  currentImage = images.find(img => img.id === id);
  if (!currentImage) return;
  
  // Set current index
  currentImageIndex = images.findIndex(img => img.id === id);
  
  elements.modalTitle.textContent = currentImage.originalName;
  elements.decryptKey.value = '';
  elements.decryptError.classList.add('hidden');
  elements.decryptForm.classList.remove('hidden');
  elements.imageView.classList.add('hidden');
  elements.decryptedImage.src = '';
  
  // Update image counter and carousel buttons
  updateCarouselControls();
  
  // Update decrypt form based on session key
  const hasSessionKey = !!sessionKey;
  elements.decryptKeyGroup.classList.toggle('hidden', hasSessionKey);
  elements.decryptSessionNotice.classList.toggle('hidden', !hasSessionKey);
  
  elements.viewerModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Show/hide download button based on session key
  if (elements.downloadBtn) {
    elements.downloadBtn.style.display = hasSessionKey ? 'flex' : 'none';
  }
  
  // If session key is set, auto-decrypt
  if (hasSessionKey) {
    setTimeout(() => decryptImage(), 100);
  } else {
    // Focus on key input
    setTimeout(() => elements.decryptKey.focus(), 100);
  }
}

function closeViewer() {
  elements.viewerModal.classList.remove('show');
  document.body.style.overflow = '';
  currentImage = null;
  currentImageIndex = -1;
  elements.decryptedImage.src = '';
  resetImageZoom();
}

elements.closeModal.addEventListener('click', closeViewer);
elements.viewerModal.querySelector('.modal-overlay').addEventListener('click', closeViewer);

// Close on escape key and handle arrow keys for carousel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (elements.viewerModal.classList.contains('show')) {
      closeViewer();
    }
    if (elements.sessionKeyModal.classList.contains('show')) {
      closeSessionKeyModal();
    }
  }
  
  // Carousel navigation with arrow keys
  if (elements.viewerModal.classList.contains('show')) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showPreviousImage();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      showNextImage();
    }
  }
});

// Decrypt button
elements.decryptBtn.addEventListener('click', decryptImage);
elements.decryptKey.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') decryptImage();
});

// Download button in viewer
if (elements.downloadBtn) {
  elements.downloadBtn.addEventListener('click', () => {
    if (currentImage) {
      downloadImage(currentImage.id);
    }
  });
}

async function decryptImage() {
  if (!currentImage) return;
  
  // Use session key if available, otherwise use form input
  const key = sessionKey || elements.decryptKey.value;
  if (!key) {
    showError('Please enter the decryption key');
    return;
  }
  
  elements.decryptBtn.disabled = true;
  elements.decryptBtn.textContent = '⏳ Decrypting...';
  elements.decryptError.classList.add('hidden');
  
  try {
    const response = await fetch(`/api/decrypt/${currentImage.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      elements.decryptedImage.src = result.image;
      elements.decryptForm.classList.add('hidden');
      elements.imageView.classList.remove('hidden');
      resetImageZoom();
    } else {
      showError(result.error || 'Decryption failed');
      // If using session key and it failed, show the key input
      if (sessionKey) {
        elements.decryptKeyGroup.classList.remove('hidden');
        elements.decryptSessionNotice.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Decryption error:', error);
    showError('Failed to decrypt image');
  } finally {
    elements.decryptBtn.disabled = false;
    elements.decryptBtn.textContent = '🔓 Decrypt & View';
  }
}

function showError(message) {
  elements.decryptError.textContent = message;
  elements.decryptError.classList.remove('hidden');
}

// ===== Download Image =====
async function downloadImage(imageId) {
  if (!sessionKey) {
    showToast('Session key required to download image', 'error');
    return;
  }
  
  const image = images.find(img => img.id === imageId);
  if (!image) {
    showToast('Image not found', 'error');
    return;
  }
  
  try {
    showToast('Decrypting and preparing download...', 'info');
    
    const response = await fetch(`/api/decrypt/${imageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: sessionKey })
    });
    
    if (!response.ok) {
      const result = await response.json();
      showToast(result.error || 'Failed to decrypt image', 'error');
      return;
    }
    
    const result = await response.json();
    
    // Convert base64 to blob
    const base64Data = result.image.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.originalName || 'image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Image downloaded successfully', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showToast('Failed to download image', 'error');
  }
}

// ===== Options Modal =====
let optionsImageId = null;

function openOptionsModal(id) {
  const image = images.find(img => img.id === id);
  if (!image) return;
  
  optionsImageId = id;
  elements.optionsModalTitle.textContent = image.originalName;
  
  // Display tags
  renderTagBadges(image.tags || [], 'optionsImageTags');
  elements.optionsTagEditInput.value = (image.tags || []).join(', ');
  
  // Show/hide lock button based on whether image is decrypted
  const isDecrypted = currentImage && currentImage.id === id && !elements.imageView.classList.contains('hidden');
  elements.optionsLockBtn.style.display = isDecrypted ? 'block' : 'none';
  
  elements.optionsModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeOptionsModal() {
  elements.optionsModal.classList.remove('show');
  document.body.style.overflow = '';
  optionsImageId = null;
}

elements.closeOptionsModal.addEventListener('click', closeOptionsModal);
elements.optionsModal.querySelector('.modal-overlay').addEventListener('click', closeOptionsModal);

// Save tags from options modal
elements.optionsSaveTagsBtn.addEventListener('click', async () => {
  if (!optionsImageId) return;
  
  const tags = parseTags(elements.optionsTagEditInput.value);
  
  if (!sessionKey) {
    showToast('Session key required to update tags', 'error');
    return;
  }
  
  const success = await updateImageTags(optionsImageId, tags);
  
  if (success) {
    // Update display
    renderTagBadges(tags, 'optionsImageTags');
    
    // Refresh gallery to show updated tags
    renderImages();
    
    // If this is the current image in viewer, update its tags too
    if (currentImage && currentImage.id === optionsImageId) {
      currentImage.tags = tags;
    }
    
    showToast('Tags updated successfully', 'success');
  }
});

// Lock button from options
elements.optionsLockBtn.addEventListener('click', () => {
  if (currentImage && currentImage.id === optionsImageId) {
    elements.decryptForm.classList.remove('hidden');
    elements.imageView.classList.add('hidden');
    elements.decryptedImage.src = '';
    elements.decryptKey.value = '';
    resetImageZoom();
    
    closeOptionsModal();
    showToast('Image locked', 'info');
  }
});

// Delete button from options
elements.optionsDeleteBtn.addEventListener('click', async () => {
  if (!optionsImageId) return;
  
  const image = images.find(img => img.id === optionsImageId);
  if (!image) return;
  
  if (!confirm(`Are you sure you want to delete "${image.originalName}"? This cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/images/${optionsImageId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showToast('Image deleted successfully', 'success');
      closeOptionsModal();
      
      // If the deleted image is currently open in viewer, close it
      if (currentImage && currentImage.id === optionsImageId) {
        closeViewer();
      }
      
      loadImages();
    } else {
      const result = await response.json();
      showToast(result.error || 'Failed to delete image', 'error');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete image', 'error');
  }
});

// ===== Search =====
if (elements.searchInput) {
  // Search on Enter key
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchImages(elements.searchInput.value);
    }
  });
  
  // Real-time search as user types (debounced)
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchImages(e.target.value);
    }, 300);
  });
}

if (elements.searchBtn) {
  elements.searchBtn.addEventListener('click', () => {
    searchImages(elements.searchInput.value);
  });
}

if (elements.clearSearchBtn) {
  elements.clearSearchBtn.addEventListener('click', clearSearch);
}

// ===== Tag Management =====

// Tag suggestions in encrypt form
if (elements.imageTagsInput) {
  elements.imageTagsInput.addEventListener('input', (e) => {
    const value = e.target.value;
    const lastTag = value.split(',').pop().trim();
    showTagSuggestions(lastTag, elements.tagSuggestions);
  });
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target !== elements.imageTagsInput) {
      elements.tagSuggestions.style.display = 'none';
    }
  });
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initThumbnailToggle();
  updateSessionKeyUI();
  loadImages();
});

// Expose to window for onclick handlers
window.switchTab = switchTab;
window.openViewer = openViewer;
window.openOptionsModal = openOptionsModal;
window.selectSuggestion = selectSuggestion;
window.downloadImage = downloadImage;
