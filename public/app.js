// ===== Secure Image Viewer App =====

// State
let images = [];
let currentImage = null;
let selectedFile = null;
let sessionKey = null; // Session-wide encryption/decryption key

// DOM Elements
const elements = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  // Gallery
  imageGrid: document.getElementById('imageGrid'),
  emptyState: document.getElementById('emptyState'),
  refreshBtn: document.getElementById('refreshBtn'),
  
  // Encrypt Form
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  preview: document.getElementById('preview'),
  previewImg: document.getElementById('previewImg'),
  removeBtn: document.getElementById('removeBtn'),
  encryptForm: document.getElementById('encryptForm'),
  imageName: document.getElementById('imageName'),
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
  decryptedImage: document.getElementById('decryptedImage'),
  deleteBtn: document.getElementById('deleteBtn'),
  lockBtn: document.getElementById('lockBtn'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer'),
  
  // Theme
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  
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
  clearSessionKeyBtn: document.getElementById('clearSessionKeyBtn')
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

// ===== Session Key Management =====
function updateSessionKeyUI() {
  const hasSessionKey = !!sessionKey;
  
  // Update header icon
  elements.sessionKeyBtn.classList.toggle('active', hasSessionKey);
  elements.sessionKeyIcon.textContent = hasSessionKey ? '🔓' : '🔑';
  
  // Update banner
  elements.sessionBanner.classList.toggle('hidden', !hasSessionKey);
  
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
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('key', key);
    formData.append('name', elements.imageName.value || selectedFile.name);
    
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
  }
});

// ===== Load Images =====
async function loadImages() {
  try {
    const response = await fetch('/api/images');
    const result = await response.json();
    
    images = result.images || [];
    renderImages();
  } catch (error) {
    console.error('Failed to load images:', error);
    showToast('Failed to load images', 'error');
  }
}

function renderImages() {
  if (images.length === 0) {
    elements.imageGrid.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  }
  
  elements.emptyState.classList.add('hidden');
  
  elements.imageGrid.innerHTML = images.map(img => `
    <div class="image-card" data-id="${img.id}">
      <div class="image-placeholder">
        <span class="lock-emoji">🔒</span>
      </div>
      <div class="image-info">
        <h4 class="image-name" title="${img.originalName}">${img.originalName}</h4>
        <p class="image-meta">
          ${formatFileSize(img.size)} • ${formatDate(img.encryptedAt)}
        </p>
      </div>
      <button class="btn btn-view" onclick="openViewer('${img.id}')">
        👁️ View
      </button>
    </div>
  `).join('');
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

// ===== Image Viewer Modal =====
function openViewer(id) {
  currentImage = images.find(img => img.id === id);
  if (!currentImage) return;
  
  elements.modalTitle.textContent = currentImage.originalName;
  elements.decryptKey.value = '';
  elements.decryptError.classList.add('hidden');
  elements.decryptForm.classList.remove('hidden');
  elements.imageView.classList.add('hidden');
  elements.lockBtn.style.display = 'none';
  elements.decryptedImage.src = '';
  
  // Update decrypt form based on session key
  const hasSessionKey = !!sessionKey;
  elements.decryptKeyGroup.classList.toggle('hidden', hasSessionKey);
  elements.decryptSessionNotice.classList.toggle('hidden', !hasSessionKey);
  
  elements.viewerModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
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
  elements.decryptedImage.src = '';
}

elements.closeModal.addEventListener('click', closeViewer);
elements.viewerModal.querySelector('.modal-overlay').addEventListener('click', closeViewer);

// Close on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (elements.viewerModal.classList.contains('show')) {
      closeViewer();
    }
    if (elements.sessionKeyModal.classList.contains('show')) {
      closeSessionKeyModal();
    }
  }
});

// Decrypt button
elements.decryptBtn.addEventListener('click', decryptImage);
elements.decryptKey.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') decryptImage();
});

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
      elements.lockBtn.style.display = 'block';
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

// Lock button
elements.lockBtn.addEventListener('click', () => {
  elements.decryptForm.classList.remove('hidden');
  elements.imageView.classList.add('hidden');
  elements.lockBtn.style.display = 'none';
  elements.decryptedImage.src = '';
  elements.decryptKey.value = '';
  elements.decryptKey.focus();
});

// Delete button
elements.deleteBtn.addEventListener('click', async () => {
  if (!currentImage) return;
  
  if (!confirm('Are you sure you want to delete this encrypted image? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/images/${currentImage.id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showToast('Image deleted successfully', 'success');
      closeViewer();
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

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateSessionKeyUI();
  loadImages();
});

// Expose to window for onclick handlers
window.switchTab = switchTab;
window.openViewer = openViewer;
