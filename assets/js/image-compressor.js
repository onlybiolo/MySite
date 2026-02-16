// ============================================
// Btoolsify - Image Compressor
// Usa OxiPNG WASM locale — nessun server richiesto
// ============================================

var images = [];
var currentIndex = 0;
var mode = 'lossy';
var opts = { bg: false, strip: true, web: false };
var debounceTimer = null;
var isDragging = false;
var comparePos = 50;
var oxipngReady = false;

// ── Init OxiPNG WASM ─────────────────────────
async function initOxiPNG() {
    if (oxipngReady) return true;
    if (!window.OxiPNG) return false;
    try {
        // Path relativo al .wasm — adatta se necessario
        await window.OxiPNG.init();
        oxipngReady = true;
        console.log('OxiPNG WASM pronto!');
        return true;
    } catch (e) {
        console.warn('OxiPNG init fallito:', e);
        return false;
    }
}

// ── Init pagina ───────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    var fileInput = document.getElementById('fileInput');
    var uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', function (e) { handleFiles(Array.from(e.target.files)); });

    uploadZone.addEventListener('dragover', function (e) { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', function () { uploadZone.classList.remove('dragover'); });
    uploadZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(Array.from(e.dataTransfer.files));
    });
    uploadZone.addEventListener('click', function (e) {
        if (!e.target.closest('.btn-upload')) fileInput.click();
    });
    uploadZone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') fileInput.click();
    });

    document.getElementById('quality-slider').addEventListener('input', function (e) {
        onQualitySlide(e.target.value);
    });

    // Precarica OxiPNG subito in background
    initOxiPNG();

    initCompareDrag();
});

// ── Load files ────────────────────────────────
function handleFiles(files) {
    var valid = files.filter(function (f) {
        return ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
    });
    var invalid = files.length - valid.length;

    if (!valid.length) {
        showToast('Seleziona immagini JPG, PNG o WEBP!', 'error');
        return;
    }
    if (invalid > 0) showToast(invalid + ' file ignorati (formato non supportato)', 'error');

    showProgress('Caricamento immagini...', 10);

    var loaded = 0;

    valid.forEach(function (f) {
        var reader = new FileReader();
        reader.onload = function (ev) {
            var img = new Image();
            img.onload = function () {
                images.push({
                    file: f,
                    img: img,
                    originalW: img.naturalWidth,
                    originalH: img.naturalHeight,
                    arrayBuffer: ev.target.result, // per OxiPNG
                    compressedBlob: null
                });
                loaded++;
                showProgress('Caricamento ' + loaded + '/' + valid.length + '...', 10 + Math.round(loaded / valid.length * 70));
                if (loaded === valid.length) {
                    hideProgress();
                    currentIndex = 0;
                    showEditorArea();
                    renderBatchList();
                    loadToEditor(currentIndex);
                    announceStatus(images.length + ' immagini caricate.');
                }
            };
            img.onerror = function () {
                loaded++;
                showToast('Errore nel caricamento di ' + f.name, 'error');
                if (loaded === valid.length && images.length > 0) {
                    hideProgress();
                    showEditorArea();
                    renderBatchList();
                    loadToEditor(currentIndex);
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(f);
    });
}

// ── Load item into editor ─────────────────────
function loadToEditor(index) {
    currentIndex = index;
    var item = images[index];
    if (!item) return;
    document.getElementById('current-filename').textContent = item.file.name;
    document.getElementById('current-meta').textContent =
        item.originalW + ' × ' + item.originalH + 'px — ' + formatSize(item.file.size);
    document.querySelectorAll('.batch-item').forEach(function (el, i) {
        el.classList.toggle('active', i === index);
    });
    scheduleLivePreview();
}

// ── Mode ──────────────────────────────────────
function setMode(m) {
    mode = m;
    document.querySelectorAll('.mode-tab').forEach(function (t) {
        var isActive = t.dataset.mode === m;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-pressed', isActive);
    });
    var hints = {
        lossy: 'Lossy: file più piccolo, minima perdita visibile.',
        lossless: 'Lossless: qualità perfetta. PNG usa OxiPNG WASM locale.'
    };
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
    var el = document.getElementById('toggle-' + key);
    el.classList.toggle('on', opts[key]);
    el.setAttribute('aria-checked', opts[key]);
    scheduleLivePreview();
}

// ── Compress ──────────────────────────────────
function getOutputFormat(item) {
    var sel = document.getElementById('output-format').value;
    return sel === 'original' ? item.file.type : sel;
}

function getOutputExt(mime) {
    var map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    return map[mime] || 'jpg';
}

async function compressImage(item) {
    var quality = mode === 'lossless' ? 1.0 : parseInt(document.getElementById('quality-slider').value) / 100;
    var outputFormat = getOutputFormat(item);
    var finalQuality = opts.web ? Math.min(quality, 0.72) : quality;

    // PNG lossless → OxiPNG WASM
    if (item.file.type === 'image/png' && outputFormat === 'image/png' && mode === 'lossless') {
        var ready = await initOxiPNG();
        if (ready && window.OxiPNG) {
            try {
                // Leggi arrayBuffer dal file originale
                var ab = await item.file.arrayBuffer();
                var uint8 = new Uint8Array(ab);
                var result = window.OxiPNG.optimise(uint8, 4, false, true);
                return new Blob([result], { type: 'image/png' });
            } catch (e) {
                console.warn('OxiPNG ottimizzazione fallita, fallback canvas:', e);
            }
        } else {
            showToast('OxiPNG WASM non disponibile — assicurati che il file .wasm sia in assets/wasm/', 'error');
        }
    }

    // Tutti gli altri casi → canvas
    var canvas = document.createElement('canvas');
    canvas.width = item.originalW;
    canvas.height = item.originalH;
    var ctx = canvas.getContext('2d');

    if (opts.bg || outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(item.img, 0, 0);

    return new Promise(function (res) { canvas.toBlob(res, outputFormat, finalQuality); });
}

// ── Live preview ──────────────────────────────
function scheduleLivePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePreview, 150);
}

async function updatePreview() {
    if (!images.length) return;
    var item = images[currentIndex];
    showProgress('Compressione...', 30);

    var blob;
    try {
        blob = await compressImage(item);
    } catch (e) {
        hideProgress();
        showToast('Errore: ' + e.message, 'error');
        return;
    }

    item.compressedBlob = blob;

    var origCanvas = document.getElementById('canvas-original');
    var compCanvas = document.getElementById('canvas-compressed');

    origCanvas.width = item.originalW;
    origCanvas.height = item.originalH;
    origCanvas.getContext('2d').drawImage(item.img, 0, 0);

    var compImg = new Image();
    compImg.onload = function () {
        compCanvas.width = compImg.naturalWidth;
        compCanvas.height = compImg.naturalHeight;
        var compCtx = compCanvas.getContext('2d');
        if (opts.bg || getOutputFormat(item) === 'image/jpeg') {
            compCtx.fillStyle = '#ffffff';
            compCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
        }
        compCtx.drawImage(compImg, 0, 0);

        document.getElementById('compare-wrap').style.display = 'flex';
        document.getElementById('preview-placeholder').style.display = 'none';
        updateDivider(comparePos);
        hideProgress();

        var saving = item.file.size - blob.size;
        var savingPct = Math.round((saving / item.file.size) * 100);
        document.getElementById('stat-original').textContent = formatSize(item.file.size);
        document.getElementById('stat-compressed').textContent = formatSize(blob.size);
        document.getElementById('stat-dims').textContent = item.originalW + '×' + item.originalH;

        var savEl = document.getElementById('stat-saving');
        if (saving > 0) { savEl.textContent = '-' + savingPct + '%'; savEl.className = 'stat-value green'; }
        else if (saving < 0) { savEl.textContent = '+' + Math.abs(savingPct) + '%'; savEl.className = 'stat-value red'; }
        else { savEl.textContent = '='; savEl.className = 'stat-value'; }

        updateBatchSaving(currentIndex, saving, savingPct);
        announceStatus(formatSize(item.file.size) + ' → ' + formatSize(blob.size));
        document.getElementById('download-label').textContent =
            images.length > 1 ? 'Scarica tutto (' + images.length + ') ZIP' : 'Scarica';
    };
    compImg.src = URL.createObjectURL(blob);
}

// ── Comparison drag ───────────────────────────
function initCompareDrag() {
    var wrap = document.getElementById('compare-wrap');
    if (!wrap) return;

    var move = function (clientX) {
        if (!isDragging) return;
        var rect = wrap.getBoundingClientRect();
        comparePos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        updateDivider(comparePos);
    };

    wrap.addEventListener('mousedown', function () { isDragging = true; });
    wrap.addEventListener('touchstart', function () { isDragging = true; }, { passive: true });
    document.addEventListener('mouseup', function () { isDragging = false; });
    document.addEventListener('touchend', function () { isDragging = false; });
    document.addEventListener('mousemove', function (e) { move(e.clientX); });
    document.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); }, { passive: true });
    wrap.addEventListener('click', function (e) {
        var rect = wrap.getBoundingClientRect();
        comparePos = ((e.clientX - rect.left) / rect.width) * 100;
        updateDivider(comparePos);
    });
}

function updateDivider(pct) {
    var divider = document.getElementById('compare-divider');
    var handle = document.querySelector('.compare-handle');
    var compCanvas = document.getElementById('canvas-compressed');
    if (!divider) return;
    divider.style.left = pct + '%';
    if (handle) handle.style.left = pct + '%';
    if (compCanvas) compCanvas.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
}

// ── Download ──────────────────────────────────
async function downloadAll() {
    var btn = document.getElementById('download-btn');
    btn.disabled = true;
    showProgress('Compressione in corso...', 5);
    try {
        if (images.length === 1) {
            await downloadSingle(images[0]);
        } else {
            await downloadBatch();
        }
        showToast('✅ Download completato!', 'success');
        announceStatus('Download completato.');
    } catch (err) {
        showToast('Errore: ' + err.message, 'error');
    } finally {
        hideProgress();
        btn.disabled = false;
    }
}

async function downloadSingle(item) {
    // Tracking
    if (typeof trackUsage === 'function') {
        trackUsage('image-compressor', 'Image Compressor');
    }
    var blob = await compressImage(item);
    var ext = getOutputExt(getOutputFormat(item));
    var baseName = item.file.name.replace(/\.[^.]+$/, '');
    triggerDownload(blob, baseName + '_compressed.' + ext);
}

async function downloadBatch() {
    // Tracking
    if (typeof trackUsage === 'function') {
        trackUsage('image-compressor', 'Image Compressor');
    }
    var zip = new JSZip();
    for (var i = 0; i < images.length; i++) {
        showProgress('Compressione ' + (i + 1) + '/' + images.length + '…', 5 + Math.round((i / images.length) * 90));
        var blob = await compressImage(images[i]);
        var ext = getOutputExt(getOutputFormat(images[i]));
        var baseName = images[i].file.name.replace(/\.[^.]+$/, '');
        zip.file(baseName + '_compressed.' + ext, blob);
    }
    showProgress('Creazione ZIP…', 97);
    var zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    triggerDownload(zipBlob, 'btoolsify-compressed.zip');
}

// ── Batch list ────────────────────────────────
function renderBatchList() {
    var section = document.getElementById('batch-section');
    var list = document.getElementById('batch-list');
    if (images.length <= 1) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    document.getElementById('batch-count').textContent = images.length;
    list.innerHTML = '';
    images.forEach(function (item, i) {
        var div = document.createElement('div');
        div.className = 'batch-item' + (i === currentIndex ? ' active' : '');
        div.setAttribute('role', 'listitem');
        div.setAttribute('tabindex', '0');
        div.id = 'batch-item-' + i;
        div.innerHTML =
            '<img class="batch-thumb" src="' + item.img.src + '" alt="" aria-hidden="true">' +
            '<div style="flex:1;min-width:0;">' +
            '<div class="batch-name">' + escapeHtml(item.file.name) + '</div>' +
            '<div style="font-size:0.73rem;color:var(--text-muted);">' + formatSize(item.file.size) + '</div>' +
            '</div>' +
            '<span class="batch-saving pending" id="batch-saving-' + i + '">…</span>' +
            '<button class="batch-remove" onclick="event.stopPropagation();removeBatchItem(' + i + ')" aria-label="Rimuovi">' +
            '<i class="fas fa-times" aria-hidden="true"></i></button>';
        div.addEventListener('click', function () { loadToEditor(i); });
        div.addEventListener('keydown', function (e) { if (e.key === 'Enter') loadToEditor(i); });
        list.appendChild(div);
    });
}

function updateBatchSaving(index, saving, pct) {
    var el = document.getElementById('batch-saving-' + index);
    if (!el) return;
    if (saving > 0) { el.textContent = '-' + pct + '%'; el.className = 'batch-saving good'; }
    else if (saving < 0) { el.textContent = '+' + Math.abs(pct) + '%'; el.className = 'batch-saving bad'; }
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
    ['stat-original', 'stat-compressed', 'stat-saving', 'stat-dims'].forEach(function (id) {
        document.getElementById(id).textContent = '—';
    });
}

function showProgress(msg, pct) {
    var wrap = document.getElementById('progress-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    document.getElementById('progress-label').textContent = msg;
    var bar = document.getElementById('progress-bar');
    bar.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', pct);
}
function hideProgress() {
    var wrap = document.getElementById('progress-wrap');
    if (wrap) wrap.style.display = 'none';
}
function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
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
    var el = document.getElementById('aria-status');
    if (el) el.textContent = msg;
}
function showToast(message, type) {
    type = type || 'success';
    if (typeof window.showNotification === 'function') { window.showNotification(message, type); return; }
    var toast = document.createElement('div');
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
        'background:' + (type === 'error' ? '#ef4444' : '#059669') + ';color:white;' +
        'padding:14px 28px;border-radius:50px;font-weight:600;z-index:9999;' +
        'box-shadow:0 4px 20px rgba(0,0,0,0.2);';
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3500);
}