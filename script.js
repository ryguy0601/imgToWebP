const imageInput = document.getElementById('imageInput');
const imageViewer = document.getElementById('imageViewer');
const errorDiv = document.getElementById('error');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

let imageBlocks = [];
let currentIndex = 0;
let webpQuality = 0.85;
let originalFiles = [];

if (qualitySlider && qualityValue) {
  qualitySlider.addEventListener('input', function() {
    qualityValue.textContent = qualitySlider.value;
    webpQuality = parseInt(qualitySlider.value, 10) / 100;
    if (originalFiles.length > 0) {
      reloadImagesWithCurrentQuality();
    }
  });
  webpQuality = parseInt(qualitySlider.value, 10) / 100;
}

function clearImages() {
  imageViewer.innerHTML = '';
  errorDiv.textContent = '';
  imageBlocks = [];
  currentIndex = 0;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  downloadAllBtn.disabled = true;
}

function reloadImagesWithCurrentQuality() {
  const prevIndex = currentIndex;
  if (originalFiles.length && originalFiles[prevIndex]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      imageViewer.innerHTML = '';
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '56vh';
      img.style.display = 'block';
      img.style.margin = '2rem auto';
      img.alt = 'Loading...';
      imageViewer.appendChild(img);
    };
    reader.readAsDataURL(originalFiles[prevIndex]);
  } else {
    imageViewer.innerHTML = '';
  }
  errorDiv.textContent = '';
  imageBlocks = [];
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  downloadAllBtn.disabled = true;
  processFiles(originalFiles, prevIndex);
}

function processFiles(files, showIndex = 0) {
  let validImages = 0;
  const indexedFiles = files.map((file, idx) => ({ file, idx }));
  indexedFiles.sort((a, b) => a.idx - b.idx);

  indexedFiles.forEach(({ file, idx }) => {
    if (!file.type.startsWith('image/')) return;
    validImages++;
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(function(blob) {
          if (!blob) {
            errorDiv.textContent = 'Conversion failed.';
            return;
          }
          const webpUrl = URL.createObjectURL(blob);

          // Calculate sizes
          const originalSize = file.size;
          const webpSize = blob.size;
          function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
          }

          const block = document.createElement('div');
          block.className = 'img-block mb-4';
          block.innerHTML = `
            <div class="webp-label mb-2">
              Slide to compare: Original vs WebP
              <div style="font-size:0.98em; margin-top:0.4em;">
                <span style="color:#FF00FF;">Original: ${formatSize(originalSize)}</span>
                &nbsp;|&nbsp;
                <span style="color:#1976d2;">WebP: ${formatSize(webpSize)}</span>
                &nbsp;|&nbsp;
                <span style="color:#0f0;">
                  ${webpSize < originalSize ? '-' : '+'}${Math.abs(((webpSize - originalSize) / originalSize * 100)).toFixed(1)}%
                </span>
              </div>
            </div>
            <div class="download-link">
              <a href="${webpUrl}" download="${file.name.replace(/\.[^/.]+$/, "")}.webp">Download WebP</a>
            </div>
          `;
          const slider = createSlider(e.target.result, webpUrl, file.name);
          block.insertBefore(slider, block.querySelector('.download-link'));
          imageBlocks[idx] = { file, block, webpBlob: blob };
          if (imageBlocks.filter(Boolean).length === validImages) {
            showImage(Math.min(showIndex, imageBlocks.length - 1));
            downloadAllBtn.disabled = false;
          }
        }, 'image/webp', webpQuality);
      };
      img.onerror = function() {
        errorDiv.textContent = 'Failed to load image.';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  if (validImages === 0) {
    errorDiv.textContent = 'Please select valid image files.';
  }
  prevBtn.disabled = true;
  nextBtn.disabled = validImages <= 1;
}

function showImage(idx) {
  imageViewer.innerHTML = '';
  if (imageBlocks.length === 0) return;
  const { block } = imageBlocks[idx];
  imageViewer.appendChild(block);
  prevBtn.disabled = idx === 0;
  nextBtn.disabled = idx === imageBlocks.length - 1;
}

function createSlider(originalUrl, webpUrl, fileName) {
  const container = document.createElement('div');
  container.className = 'slider-container mb-2';

  // Labels
  const labels = document.createElement('div');
  labels.className = 'slider-labels';
  labels.innerHTML = `<span>Original</span><span>WebP</span>`;
  container.appendChild(labels);

  // Ensure original is on the left, webp on the right
  const imgOriginal = document.createElement('img');
  imgOriginal.src = originalUrl;
  imgOriginal.className = 'slider-img original';
  imgOriginal.alt = 'Original';

  const imgWebp = document.createElement('img');
  imgWebp.src = webpUrl;
  imgWebp.className = 'slider-img webp';
  imgWebp.alt = 'WebP';

  const sliderBar = document.createElement('div');
  sliderBar.className = 'slider-bar';

  // Order: original first, then webp, then bar
  container.appendChild(imgWebp);
  container.appendChild(imgOriginal);
  container.appendChild(sliderBar);

  // Slider logic
  let dragging = false;

  function setSlider(x) {
    const rect = container.getBoundingClientRect();
    let percent = (x - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    imgOriginal.style.clipPath = `inset(0 ${(1 - percent) * 100}% 0 0)`;
    sliderBar.style.left = `${percent * 100}%`;
  }

  function setSliderByPercent(percent) {
    percent = Math.max(0, Math.min(1, percent));
    imgOriginal.style.clipPath = `inset(0 ${(1 - percent) * 100}% 0 0)`;
    sliderBar.style.left = `${percent * 100}%`;
  }

  sliderBar.addEventListener('mousedown', e => {
    dragging = true;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    setSlider(e.clientX);
  });
  window.addEventListener('mouseup', e => {
    dragging = false;
    document.body.style.userSelect = '';
  });

  // Touch support
  sliderBar.addEventListener('touchstart', e => {
    dragging = true;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('touchmove', e => {
    if (!dragging) return;
    setSlider(e.touches[0].clientX);
  });
  window.addEventListener('touchend', e => {
    dragging = false;
    document.body.style.userSelect = '';
  });

  // Keyboard accessibility
  sliderBar.setAttribute('tabindex', '0');
  sliderBar.setAttribute('role', 'slider');
  sliderBar.setAttribute('aria-valuenow', '50');
  sliderBar.setAttribute('aria-valuemin', '0');
  sliderBar.setAttribute('aria-valuemax', '100');
  sliderBar.setAttribute('aria-label', 'Move slider to compare images');
  sliderBar.addEventListener('keydown', e => {
    let left = parseFloat(sliderBar.style.left) || 50;
    if (e.key === 'ArrowLeft' || e.key === 'a') {
      left = Math.max(0, left - 2);
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      left = Math.min(100, left + 2);
    } else {
      return;
    }
    setSliderByPercent(left / 100);
    sliderBar.setAttribute('aria-valuenow', Math.round(left));
    e.preventDefault();
  });

  // Set initial slider to 50%
  setTimeout(() => {
    setSliderByPercent(0.5);
  }, 0);

  return container;
}

// Drag & Drop support for imageViewer
imageViewer.addEventListener('dragover', e => {
  e.preventDefault();
  imageViewer.style.border = '2px dashed #FF00FF';
});
imageViewer.addEventListener('dragleave', e => {
  e.preventDefault();
  imageViewer.style.border = '';
});
imageViewer.addEventListener('drop', e => {
  e.preventDefault();
  imageViewer.style.border = '';
  if (e.dataTransfer.files.length) {
    imageInput.files = e.dataTransfer.files;
    imageInput.dispatchEvent(new Event('change'));
  }
});

imageInput.addEventListener('change', function() {
  clearImages();
  const files = Array.from(this.files);
  originalFiles = files;
  if (!files.length) {
    return;
  }
  processFiles(files);
});

prevBtn.addEventListener('click', function() {
  if (currentIndex > 0) {
    currentIndex--;
    showImage(currentIndex);
  }
});

nextBtn.addEventListener('click', function() {
  if (currentIndex < imageBlocks.length - 1) {
    currentIndex++;
    showImage(currentIndex);
  }
});

downloadAllBtn.addEventListener('click', async function() {
  if (!imageBlocks.length) return;
  const zip = new JSZip();
  const folder = zip.folder("webp-images");
  imageBlocks.forEach(({ file, webpBlob }) => {
    const name = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    folder.file(name, webpBlob);
  });
  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = "Preparing ZIP...";
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = "webp-images.zip";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    downloadAllBtn.textContent = "Download All as ZIP";
    downloadAllBtn.disabled = false;
  }, 1000);
});