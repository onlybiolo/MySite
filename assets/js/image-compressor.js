// ============================================
// Btoolsify - Image Compressor
// ============================================

// ── State ─────────────────────────────────────
let images = [];
let currentIndex = 0;
let mode = 'lossy';
let opts = { bg: false, strip: true, web: false };
let debounceTimer = null;
let isDragging = false;
let comparePos = 50; // percent

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', e => handleFiles(Array.from(e.target.files)));

    // Upload zone drag & drop
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault(); uploadZone.classList.remove('dragover');
        handleFiles(Array.from(e.dataTransfer.files));
    });
    uploadZone.addEventListener('click', e => { if (!e.target.closest('.btn-upload')) fileInput.click(); });
    uploadZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

    // Quality slider
    document.getElementById('quality-slider').addEventListener('input', e => {
        onQualitySlide(e.target.value);
    });

    // Comparison drag
    initCompareDrag();
});

// ── Load files ────────────────────────────────
async function handleFiles(files) {
    const valid = files.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    const invalid = files.length - valid.length;

    if (!valid.length) {
        showToast('Seleziona immagini JPG, PNG o WEBP!', 'error');
        announceStatus('Nessun file valido selezionato.');
        return;
    }
    if (invalid > 0) showToast(`${invalid} file ignorati (formato non supportato)`, 'error');

    showProgress('Caricamento immagini...', 10);

    for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        try {
            const img = await loadImage(f);
            images.push({ file: f, img, originalW: img.naturalWidth, originalH: img.naturalHeight, compressedBlob: null });
        } catch {
            showToast(`Errore nel caricamento di ${f.name}`, 'error');
        }
        showProgress(`Caricamento ${i + 1}/${valid.length}...`, 10 + Math.round((i + 1) / valid.length * 70));
    }

    hideProgress();
    currentIndex = 0;
    showEditorArea();
    renderBatchList();
    loadToEditor(currentIndex);
    announceStatus(`${images.length} immagini caricate. Pronte per la compressione.`);
}

function loadImage(file) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('Caricamento fallito'));
        img.src = URL.createObjectURL(file);
    });
}

// ── Load item into editor ─────────────────────
function loadToEditor(index) {
    currentIndex = index;
    const item = images[index];
    if (!item) return;

    document.getElementById('current-filename').textContent = item.file.name;
    document.getElementById('current-meta').textContent =
        `${item.originalW} × ${item.originalH}px — ${formatSize(item.file.size)}`;

    // Highlight active in batch
    document.querySelectorAll('.batch-item').forEach((el, i) => el.classList.toggle('active', i === index));

    scheduleLivePreview();
}

// ── Mode ──────────────────────────────────────
function setMode(m) {
    mode = m;
    document.querySelectorAll('.mode-tab').forEach(t => {
        const isActive = t.dataset.mode === m;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-pressed', isActive);
    });
    const hints = { lossy: 'Lossy: file più piccolo, minima perdita visibile.', lossless: 'Lossless: qualità perfetta, compressione limitata. Meglio per PNG.' };
    document.getElementById('mode-hint').textContent = hints[m];
    document.getElementById('quality-section').style.opacity = m === 'lossless' ? '0.4' : '1';
    document.getElementById('quality-section').style.pointerEvents = m === 'lossless' ? 'none' : '';
    scheduleLivePreview();
}

// ── Quality ───────────────────────────────────
function onQualitySlide(val) {
    document.getElementById('quality-val').textContent = val;
    document.getElementById('quality-slider').setAttribute('aria-valuenow', val);
    scheduleLivePreview();
}

// ── Options ───────────────────────────────────
function toggleOpt(key) {
    opts[key] = !opts[key];
    const el = document.getElementById('toggle-' + key);
    el.classList.toggle('on', opts[key]);
    el.setAttribute('aria-checked', opts[key]);
    scheduleLivePreview();
}

// ── Compress ──────────────────────────────────
function getOutputFormat(item) {
    const sel = document.getElementById('output-format').value;
    return sel === 'original' ? item.file.type : sel;
}

function getOutputExt(mime) {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime] || 'jpg';
}

async function compressImage(item) {
    const quality = mode === 'lossless' ? 1.0 : parseInt(document.getElementById('quality-slider').value) / 100;
    const format = getOutputFormat(item);
    let finalQuality = quality;
    if (opts.web && finalQuality > 0.72) finalQuality = 0.72;

    const canvas = document.createElement('canvas');
    canvas.width = item.originalW;
    canvas.height = item.originalH;
    const ctx = canvas.getContext('2d');

    if (opts.bg || format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(item.img, 0, 0);

    return new Promise(res => canvas.toBlob(res, format, finalQuality));
}

// ── Live preview ──────────────────────────────
function scheduleLivePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePreview, 100);
}

async function updatePreview() {
    if (!images.length) return;
    const item = images[currentIndex];

    const blob = await compressImage(item);
    item.compressedBlob = blob;

    // Draw both canvases
    const origCanvas = document.getElementById('canvas-original');
    const compCanvas = document.getElementById('canvas-compressed');

    // Original
    origCanvas.width = item.originalW;
    origCanvas.height = item.originalH;
    origCanvas.getContext('2d').drawImage(item.img, 0, 0);

    // Compressed
    const compImg = await blobToImage(blob);
    compCanvas.width = compImg.naturalWidth;
    compCanvas.height = compImg.naturalHeight;
    const compCtx = compCanvas.getContext('2d');
    if (opts.bg || getOutputFormat(item) === 'image/jpeg') {
        compCtx.fillStyle = '#ffffff';
        compCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
    }
    compCtx.drawImage(compImg, 0, 0);

    // Show compare
    document.getElementById('compare-wrap').style.display = 'flex';
    document.getElementById('preview-placeholder').style.display = 'none';
    updateDivider(comparePos);

    // Stats
    const saving = item.file.size - blob.size;
    const savingPct = Math.round((saving / item.file.size) * 100);
    document.getElementById('stat-original').textContent = formatSize(item.file.size);
    document.getElementById('stat-compressed').textContent = formatSize(blob.size);
    document.getElementById('stat-dims').textContent = `${item.originalW}×${item.originalH}`;

    const savEl = document.getElementById('stat-saving');
    if (saving > 0) {
        savEl.textContent = `-${savingPct}%`;
        savEl.className = 'stat-value green';
    } else if (saving < 0) {
        savEl.textContent = `+${Math.abs(savingPct)}%`;
        savEl.className = 'stat-value red';
    } else {
        savEl.textContent = '0%';
        savEl.className = 'stat-value';
    }

    announceStatus(`Compressione: ${formatSize(item.file.size)} → ${formatSize(blob.size)} (${saving > 0 ? '-' : '+'}${Math.abs(savingPct)}%)`);

    // Update batch saving indicator
    updateBatchSaving(currentIndex, saving, savingPct);

    // Update download label
    document.getElementById('download-label').textContent =
        images.length > 1 ? `Scarica tutto (${images.length}) ZIP` : 'Scarica';
}

function blobToImage(blob) {
    return new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = URL.createObjectURL(blob);
    });
}

// ── Comparison drag ───────────────────────────
function initCompareDrag() {
    const wrap = document.getElementById('compare-wrap');
    if (!wrap) return;

    const move = (clientX) => {
        if (!isDragging) return;
        const rect = wrap.getBoundingClientRect();
        comparePos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        updateDivider(comparePos);
    };

    wrap.addEventListener('mousedown', () => { isDragging = true; });
    wrap.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
    document.addEventListener('mouseup', () => { isDragging = false; });
    document.addEventListener('touchend', () => { isDragging = false; });
    document.addEventListener('mousemove', e => move(e.clientX));
    document.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });

    // Click to set position
    wrap.addEventListener('click', e => {
        const rect = wrap.getBoundingClientRect();
        comparePos = ((e.clientX - rect.left) / rect.width) * 100;
        updateDivider(comparePos);
    });
}

function updateDivider(pct) {
    const divider = document.getElementById('compare-divider');
    const handle = document.querySelector('.compare-handle');
    const compCanvas = document.getElementById('canvas-compressed');
    if (!divider) return;
    divider.style.left = pct + '%';
    if (handle) handle.style.left = pct + '%';
    if (compCanvas) compCanvas.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
}

// ── Download ──────────────────────────────────
async function downloadAll() {
    const btn = document.getElementById('download-btn');
    btn.disabled = true;
    showProgress('Compressione in corso...', 5);

    try {
        if (images.length === 1) {
            await downloadSingle(images[0]);
        } else {
            await downloadBatch();
        }
        showToast(`✅ Download completato!`, 'success');
        announceStatus('Download completato con successo.');
    } catch (err) {
        showToast('Errore durante il download: ' + err.message, 'error');
    } finally {
        hideProgress();
        btn.disabled = false;
    }
}

async function downloadSingle(item) {
    const blob = await compressImage(item);
    const format = getOutputFormat(item);
    const ext = getOutputExt(format);
    const baseName = item.file.name.replace(/\.[^.]+$/, '');
    triggerDownload(blob, `${baseName}_compressed.${ext}`);
    showProgress('Completato!', 100);
}

async function downloadBatch() {
    const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
        const item = images[i];
        showProgress(`Compressione ${i + 1}/${images.length}…`, 5 + Math.round((i / images.length) * 90));
        const blob = await compressImage(item);
        const format = getOutputFormat(item);
        const ext = getOutputExt(format);
        const baseName = item.file.name.replace(/\.[^.]+$/, '');
        zip.file(`${baseName}_compressed.${ext}`, blob);
    }
    showProgress('Creazione ZIP…', 97);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    triggerDownload(zipBlob, 'btoolsify-compressed.zip');
}

// ── Batch list ────────────────────────────────
function renderBatchList() {
    const section = document.getElementById('batch-section');
    const list = document.getElementById('batch-list');
    const count = document.getElementById('batch-count');

    if (images.length <= 1) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    count.textContent = images.length;
    list.innerHTML = '';

    images.forEach((item, i) => {
        const url = URL.createObjectURL(item.file);
        const div = document.createElement('div');
        div.className = 'batch-item' + (i === currentIndex ? ' active' : '');
        div.setAttribute('role', 'listitem');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', `${item.file.name}, ${formatSize(item.file.size)}`);
        div.id = `batch-item-${i}`;
        div.innerHTML = `
            <img class="batch-thumb" src="${url}" alt="" aria-hidden="true">
            <div style="flex:1;min-width:0;">
                <div class="batch-name">${escapeHtml(item.file.name)}</div>
                <div style="font-size:0.73rem;color:var(--text-muted);">${formatSize(item.file.size)}</div>
            </div>
            <span class="batch-saving pending" id="batch-saving-${i}">…</span>
            <button class="batch-remove" onclick="event.stopPropagation();removeBatchItem(${i})"
                    aria-label="Rimuovi ${escapeHtml(item.file.name)}">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;
        div.addEventListener('click', () => loadToEditor(i));
        div.addEventListener('keydown', e => { if (e.key === 'Enter') loadToEditor(i); });
        list.appendChild(div);
    });
}

function updateBatchSaving(index, saving, pct) {
    const el = document.getElementById(`batch-saving-${index}`);
    if (!el) return;
    if (saving > 0) { el.textContent = `-${pct}%`; el.className = 'batch-saving good'; }
    else if (saving < 0) { el.textContent = `+${Math.abs(pct)}%`; el.className = 'batch-saving bad'; }
    else { el.textContent = '0%'; el.className = 'batch-saving'; }
}

function removeBatchItem(index) {
    images.splice(index, 1);
    if (!images.length) { resetTool(); return; }
    if (currentIndex >= images.length) currentIndex = 0;
    renderBatchList();
    loadToEditor(currentIndex);
}

// ── UI helpers ────────────────────────────────
function showEditorArea() {
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('editor-area').style.display = 'block';
}

function resetTool() {
    images = []; currentIndex = 0;
    document.getElementById('upload-zone').style.display = '';
    document.getElementById('editor-area').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('compare-wrap').style.display = 'none';
    document.getElementById('preview-placeholder').style.display = 'flex';
    document.getElementById('batch-section').style.display = 'none';
    ['stat-original', 'stat-compressed', 'stat-saving', 'stat-dims'].forEach(id => {
        document.getElementById(id).textContent = '—';
    });
}

function showProgress(msg, pct) {
    const wrap = document.getElementById('progress-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    document.getElementById('progress-label').textContent = msg;
    const bar = document.getElementById('progress-bar');
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', pct);
}
function hideProgress() {
    const wrap = document.getElementById('progress-wrap');
    if (wrap) wrap.style.display = 'none';
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function announceStatus(msg) {
    const el = document.getElementById('aria-status');
    if (el) el.textContent = msg;
}

function showToast(message, type = 'success') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type); return;
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:${type === 'error' ? '#ef4444' : '#059669'};color:white;
        padding:14px 28px;border-radius:50px;font-weight:600;z-index:9999;
        box-shadow:0 4px 20px rgba(0,0,0,0.2);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}