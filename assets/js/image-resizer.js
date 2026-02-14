// ============================================
// Btoolsify - Image Resizer
// ============================================

// ── State ─────────────────────────────────────
let images = [];         // [{ file, img, originalW, originalH }]
let currentIndex = 0;
let ratioLocked = true;
let opts = { ratio: true, web: false, bg: false };
let debounceTimer = null;

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', e => handleFiles(Array.from(e.target.files)));

    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault(); uploadZone.classList.remove('dragover');
        handleFiles(Array.from(e.dataTransfer.files));
    });
    uploadZone.addEventListener('click', e => { if (!e.target.closest('.btn-upload')) fileInput.click(); });

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            switchMode(tab.dataset.mode);
        });
    });

    // Live inputs
    ['input-w', 'input-h', 'input-w2', 'input-h2', 'input-longest', 'target-size'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => scheduleLivePreview());
    });

    document.getElementById('quality-slider').addEventListener('input', () => scheduleLivePreview());
    document.getElementById('output-format').addEventListener('change', () => scheduleLivePreview());

    // W/H ratio sync
    document.getElementById('input-w').addEventListener('input', e => {
        if (ratioLocked && images[currentIndex]) {
            const { originalW, originalH } = images[currentIndex];
            document.getElementById('input-h').value = Math.round(e.target.value * originalH / originalW) || '';
        }
        scheduleLivePreview();
    });
    document.getElementById('input-h').addEventListener('input', e => {
        if (ratioLocked && images[currentIndex]) {
            const { originalW, originalH } = images[currentIndex];
            document.getElementById('input-w').value = Math.round(e.target.value * originalW / originalH) || '';
        }
        scheduleLivePreview();
    });
    document.getElementById('input-w2').addEventListener('input', e => { scheduleLivePreview(); });
    document.getElementById('input-h2').addEventListener('input', e => { scheduleLivePreview(); });
});

// ── Load files ────────────────────────────────
async function handleFiles(files) {
    const valid = files.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    if (!valid.length) { showToast('Seleziona immagini JPG, PNG o WEBP!', 'error'); return; }

    showProgress('Caricamento immagini...', 10);

    for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        const img = await loadImage(f);
        images.push({ file: f, img, originalW: img.naturalWidth, originalH: img.naturalHeight });
        showProgress(`Caricamento ${i + 1}/${valid.length}...`, 10 + Math.round((i + 1) / valid.length * 80));
    }

    hideProgress();
    currentIndex = 0;
    showEditorArea();
    renderBatchList();
    loadImageToEditor(currentIndex);
}

function loadImage(file) {
    return new Promise((res, rej) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => { res(img); };
        img.onerror = rej;
        img.src = url;
    });
}

// ── Switch active image ───────────────────────
function loadImageToEditor(index) {
    currentIndex = index;
    const item = images[index];
    if (!item) return;

    document.getElementById('current-filename').textContent = item.file.name;
    document.getElementById('current-meta').textContent =
        `${item.originalW} × ${item.originalH}px — ${formatSize(item.file.size)}`;

    // Default W/H
    document.getElementById('input-w').value = item.originalW;
    document.getElementById('input-h').value = item.originalH;
    document.getElementById('input-w2').value = item.originalW;
    document.getElementById('input-h2').value = item.originalH;
    document.getElementById('input-longest').value = Math.max(item.originalW, item.originalH);

    scheduleLivePreview();
}

// ── Mode switch ───────────────────────────────
function switchMode(mode) {
    ['wh', 'width', 'height', 'percent', 'longest'].forEach(m => {
        document.getElementById('dim-' + m)?.classList.toggle('hidden', m !== mode);
    });
    scheduleLivePreview();
}

// ── Lock toggle ───────────────────────────────
function toggleLock() {
    ratioLocked = !ratioLocked;
    opts.ratio = ratioLocked;
    const btn = document.getElementById('lock-btn');
    btn.classList.toggle('locked', ratioLocked);
    btn.querySelector('i').className = ratioLocked ? 'fas fa-lock' : 'fas fa-lock-open';
}

// ── Percent ───────────────────────────────────
function onPercentSlide(val) {
    document.getElementById('percent-val').textContent = val + '%';
    scheduleLivePreview();
}
function setPercent(val) {
    document.getElementById('percent-slider').value = val;
    document.getElementById('percent-val').textContent = val + '%';
    scheduleLivePreview();
}

// ── Quality ───────────────────────────────────
function onQualitySlide(val) {
    document.getElementById('quality-val').textContent = val;
    scheduleLivePreview();
}

// ── Presets ───────────────────────────────────
function applyPreset(w, h) {
    // Switch to W×H mode
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === 'wh'));
    switchMode('wh');
    document.getElementById('input-w').value = w;
    document.getElementById('input-h').value = h;
    // Temporarily unlock ratio for preset
    if (ratioLocked) {
        ratioLocked = false;
        const btn = document.getElementById('lock-btn');
        btn.classList.remove('locked');
        btn.querySelector('i').className = 'fas fa-lock-open';
    }
    scheduleLivePreview();
}

// ── Options toggles ───────────────────────────
function toggleOpt(key) {
    opts[key] = !opts[key];
    document.getElementById('toggle-' + key).classList.toggle('on', opts[key]);
    if (key === 'ratio') {
        ratioLocked = opts.ratio;
        const btn = document.getElementById('lock-btn');
        btn.classList.toggle('locked', ratioLocked);
        btn.querySelector('i').className = ratioLocked ? 'fas fa-lock' : 'fas fa-lock-open';
    }
    scheduleLivePreview();
}

function onFormatChange() { scheduleLivePreview(); }

// ── Compute target dimensions ─────────────────
function computeDimensions(item) {
    const mode = document.querySelector('.mode-tab.active')?.dataset.mode || 'wh';
    const { originalW, originalH } = item;
    let w = originalW, h = originalH;

    switch (mode) {
        case 'wh':
            w = parseInt(document.getElementById('input-w').value) || originalW;
            h = parseInt(document.getElementById('input-h').value) || originalH;
            if (opts.ratio) h = Math.round(w * originalH / originalW);
            break;
        case 'width':
            w = parseInt(document.getElementById('input-w2').value) || originalW;
            h = opts.ratio ? Math.round(w * originalH / originalW) : originalH;
            break;
        case 'height':
            h = parseInt(document.getElementById('input-h2').value) || originalH;
            w = opts.ratio ? Math.round(h * originalW / originalH) : originalW;
            break;
        case 'percent': {
            const pct = parseInt(document.getElementById('percent-slider').value) / 100;
            w = Math.round(originalW * pct);
            h = Math.round(originalH * pct);
            break;
        }
        case 'longest': {
            const longest = parseInt(document.getElementById('input-longest').value) || Math.max(originalW, originalH);
            if (originalW >= originalH) { w = longest; h = Math.round(longest * originalH / originalW); }
            else { h = longest; w = Math.round(longest * originalW / originalH); }
            break;
        }
    }

    return { w: Math.max(1, w), h: Math.max(1, h) };
}

// ── Render to canvas (high quality) ──────────
function renderToCanvas(item, targetW, targetH, quality, format) {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // White background if enabled or JPG output (JPG has no alpha)
    if (opts.bg || format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
    }

    // High quality downsampling — step-down for large reductions
    if (targetW < item.originalW / 2 || targetH < item.originalH / 2) {
        let src = item.img;
        let cw = item.originalW, ch = item.originalH;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        while (cw > targetW * 2 || ch > targetH * 2) {
            cw = Math.max(Math.round(cw / 2), targetW);
            ch = Math.max(Math.round(ch / 2), targetH);
            tempCanvas.width = cw; tempCanvas.height = ch;
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(src, 0, 0, cw, ch);
            src = tempCanvas;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, 0, 0, targetW, targetH);
    } else {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(item.img, 0, 0, targetW, targetH);
    }

    return canvas;
}

// ── Get output format ─────────────────────────
function getOutputFormat(item) {
    const sel = document.getElementById('output-format').value;
    if (sel === 'original') return item.file.type;
    return sel;
}

function getOutputExt(mime) {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime] || 'jpg';
}

// ── Live preview (debounced) ──────────────────
function scheduleLivePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePreview, 120);
}

async function updatePreview() {
    if (!images.length) return;
    const item = images[currentIndex];
    const { w, h } = computeDimensions(item);
    const quality = parseInt(document.getElementById('quality-slider').value) / 100;
    const format = getOutputFormat(item);
    const targetSizeEl = document.getElementById('target-size');
    const targetSizeVal = parseInt(targetSizeEl.value);
    const targetUnit = document.getElementById('target-unit').value;

    let finalW = w, finalH = h, finalQuality = quality;

    // Target size mode
    if (targetSizeVal > 0) {
        const targetBytes = targetSizeVal * (targetUnit === 'mb' ? 1024 * 1024 : 1024);
        const result = await fitToTargetSize(item, w, h, format, targetBytes);
        finalW = result.w; finalH = result.h; finalQuality = result.quality;
    }

    // Web optimize
    if (opts.web && finalQuality > 0.75) finalQuality = 0.75;

    const canvas = renderToCanvas(item, finalW, finalH, finalQuality, format);

    // Show on preview canvas
    const previewCanvas = document.getElementById('preview-canvas');
    const pCtx = previewCanvas.getContext('2d');
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    if (opts.bg || format === 'image/jpeg') {
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    pCtx.drawImage(canvas, 0, 0);
    previewCanvas.style.display = 'block';
    document.getElementById('preview-placeholder').style.display = 'none';

    // Stats
    const blob = await canvasToBlob(canvas, format, finalQuality);
    const saving = item.file.size - blob.size;
    const savingPct = Math.round((saving / item.file.size) * 100);

    document.getElementById('stat-size').textContent = `${finalW} × ${finalH}`;
    document.getElementById('stat-weight').textContent = formatSize(blob.size);

    const savingPill = document.getElementById('stat-saving-pill');
    if (saving > 0) {
        savingPill.style.display = 'flex';
        document.getElementById('stat-saving').textContent = `-${savingPct}%`;
        savingPill.className = 'stat-pill green';
    } else if (saving < 0) {
        savingPill.style.display = 'flex';
        document.getElementById('stat-saving').textContent = `+${Math.abs(savingPct)}%`;
        savingPill.className = 'stat-pill red';
    } else {
        savingPill.style.display = 'none';
    }

    // Update download label
    document.getElementById('download-label').textContent =
        images.length > 1 ? `Scarica tutto (${images.length}) ZIP` : 'Scarica';
}

// ── Fit to target size ────────────────────────
async function fitToTargetSize(item, w, h, format, targetBytes) {
    // Try reducing quality first (for lossy formats)
    if (format !== 'image/png') {
        for (let q = 0.9; q >= 0.1; q -= 0.05) {
            const c = renderToCanvas(item, w, h, q, format);
            const b = await canvasToBlob(c, format, q);
            if (b.size <= targetBytes) return { w, h, quality: q };
        }
    }
    // Then reduce dimensions
    let scale = 0.9;
    while (scale > 0.1) {
        const tw = Math.round(w * scale), th = Math.round(h * scale);
        const c = renderToCanvas(item, tw, th, 0.7, format);
        const b = await canvasToBlob(c, format, 0.7);
        if (b.size <= targetBytes) return { w: tw, h: th, quality: 0.7 };
        scale -= 0.05;
    }
    return { w, h, quality: 0.1 };
}

// ── Download ──────────────────────────────────
async function downloadAll() {
    const btn = document.getElementById('download-btn');
    btn.disabled = true;
    showProgress('Elaborazione...', 5);

    if (images.length === 1) {
        await downloadSingle(images[0], 0);
    } else {
        await downloadBatch();
    }

    hideProgress();
    btn.disabled = false;
    showToast(`✅ Download completato!`, 'success');
}

async function downloadSingle(item, idx) {
    const { w, h } = computeDimensions(item);
    const quality = parseInt(document.getElementById('quality-slider').value) / 100;
    const format = getOutputFormat(item);
    const targetSizeVal = parseInt(document.getElementById('target-size').value);
    const targetUnit = document.getElementById('target-unit').value;

    let finalW = w, finalH = h, finalQuality = quality;
    if (targetSizeVal > 0) {
        const targetBytes = targetSizeVal * (targetUnit === 'mb' ? 1024 * 1024 : 1024);
        const result = await fitToTargetSize(item, w, h, format, targetBytes);
        finalW = result.w; finalH = result.h; finalQuality = result.quality;
    }
    if (opts.web && finalQuality > 0.75) finalQuality = 0.75;

    const canvas = renderToCanvas(item, finalW, finalH, finalQuality, format);
    const blob = await canvasToBlob(canvas, format, finalQuality);
    const ext = getOutputExt(format);
    const baseName = item.file.name.replace(/\.[^.]+$/, '');
    triggerDownload(blob, `${baseName}_${finalW}x${finalH}.${ext}`);
    showProgress(`Elaborazione...`, 10 + (idx + 1) * 80);
}

async function downloadBatch() {
    const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
        const item = images[i];
        updateBatchStatus(i, 'processing');
        showProgress(`Elaborazione ${i + 1}/${images.length}...`, 5 + Math.round((i / images.length) * 90));

        const { w, h } = computeDimensions(item);
        const quality = parseInt(document.getElementById('quality-slider').value) / 100;
        const format = getOutputFormat(item);
        const canvas = renderToCanvas(item, w, h, quality, format);
        const blob = await canvasToBlob(canvas, format, quality);
        const ext = getOutputExt(format);
        const baseName = item.file.name.replace(/\.[^.]+$/, '');
        zip.file(`${baseName}_${w}x${h}.${ext}`, blob);
        updateBatchStatus(i, 'done');
    }
    showProgress('Creazione ZIP...', 97);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    triggerDownload(zipBlob, 'btoolsify-images.zip');
}

// ── Helpers ───────────────────────────────────
function canvasToBlob(canvas, format, quality) {
    return new Promise(res => canvas.toBlob(res, format, quality));
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

function showProgress(msg, pct) {
    const wrap = document.getElementById('progress-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    document.getElementById('progress-label').textContent = msg;
    document.getElementById('progress-bar').style.width = pct + '%';
}
function hideProgress() {
    const wrap = document.getElementById('progress-wrap');
    if (wrap) wrap.style.display = 'none';
}

function showEditorArea() {
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('editor-area').style.display = 'block';
}

function resetTool() {
    images = []; currentIndex = 0;
    document.getElementById('upload-zone').style.display = '';
    document.getElementById('editor-area').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('preview-canvas').style.display = 'none';
    document.getElementById('preview-placeholder').style.display = 'flex';
    document.getElementById('batch-section').style.display = 'none';
}

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
        div.className = 'batch-item';
        div.id = `batch-item-${i}`;
        div.innerHTML = `
            <img class="batch-thumb" src="${url}" alt="">
            <div style="flex:1;min-width:0;">
                <div class="batch-name">${item.file.name}</div>
                <div class="batch-meta">${item.originalW}×${item.originalH} — ${formatSize(item.file.size)}</div>
            </div>
            <span class="batch-status" id="batch-status-${i}"></span>
            <button class="batch-remove" onclick="removeBatchItem(${i})" aria-label="Rimuovi"><i class="fas fa-times"></i></button>
        `;
        div.addEventListener('click', e => {
            if (e.target.closest('.batch-remove')) return;
            loadImageToEditor(i);
        });
        list.appendChild(div);
    });
}

function removeBatchItem(index) {
    images.splice(index, 1);
    if (images.length === 0) { resetTool(); return; }
    if (currentIndex >= images.length) currentIndex = 0;
    renderBatchList();
    loadImageToEditor(currentIndex);
}

function updateBatchStatus(index, status) {
    const el = document.getElementById(`batch-status-${index}`);
    if (!el) return;
    el.className = 'batch-status ' + status;
    el.textContent = status === 'done' ? '✓' : '…';
}

function showToast(message, type = 'success') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type); return;
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:${type === 'error' ? '#ef4444' : '#059669'};color:white;
        padding:14px 28px;border-radius:50px;font-weight:600;z-index:9999;
        box-shadow:0 4px 20px rgba(0,0,0,0.2);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}