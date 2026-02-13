// ============================================
// Btoolsify - Split PDF Tool
// ============================================
// Dependencies: pdf-lib, pdf.js, JSZip

const { PDFDocument } = PDFLib;

// ── State ─────────────────────────────────────
let pdfFile = null;
let pdfDoc = null;
let totalPages = 0;
let pageCanvases = [];
let savedPresets = JSON.parse(localStorage.getItem('splitPresets') || '[]');

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', e => loadPDF(e.target.files[0]));

    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (f?.type === 'application/pdf') loadPDF(f);
        else showToast('Seleziona un file PDF!', 'error');
    });
    uploadZone.addEventListener('click', e => {
        if (!e.target.closest('.btn-upload')) fileInput.click();
    });

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.mode).classList.add('active');
        });
    });

    // Naming template preview
    document.getElementById('naming-template').addEventListener('input', updateNamingPreview);

    renderPresets();
});

// ── Load PDF ──────────────────────────────────
async function loadPDF(file) {
    if (!file || file.type !== 'application/pdf') {
        showToast('Seleziona un file PDF valido!', 'error');
        return;
    }

    pdfFile = file;
    showProgress('Caricamento PDF...', 10);

    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
        totalPages = pdfDoc.getPageCount();

        showProgress('Caricamento pagine...', 40);
        await renderPreviews(arrayBuffer);
        showProgress('Analisi segnalibri...', 80);
        loadBookmarks(arrayBuffer);

        hideProgress();
        showToolArea();
        document.getElementById('file-info').textContent =
            `${file.name} — ${totalPages} pagine — ${formatSize(file.size)}`;
        updateNamingPreview();

    } catch (err) {
        hideProgress();
        if (err.message?.includes('encrypted')) {
            showToast('PDF protetto da password — non supportato.', 'error');
        } else {
            showToast('Errore nel caricamento del PDF.', 'error');
        }
        console.error(err);
    }
}

// ── Render page previews ──────────────────────
async function renderPreviews(arrayBuffer) {
    const container = document.getElementById('page-previews');
    container.innerHTML = '';
    pageCanvases = [];

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= Math.min(totalPages, 50); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const wrapper = document.createElement('div');
        wrapper.className = 'page-thumb';
        wrapper.dataset.page = i;
        wrapper.innerHTML = `<span class="page-num">${i}</span>`;
        wrapper.prepend(canvas);
        wrapper.addEventListener('click', () => wrapper.classList.toggle('selected'));
        container.appendChild(wrapper);
        pageCanvases.push(wrapper);

        showProgress(`Rendering pagina ${i}/${Math.min(totalPages, 50)}...`,
            40 + Math.round((i / Math.min(totalPages, 50)) * 40));
    }

    if (totalPages > 50) {
        container.insertAdjacentHTML('beforeend',
            `<div class="thumb-note">+ ${totalPages - 50} pagine non mostrate in anteprima</div>`);
    }
}

// ── Load bookmarks ────────────────────────────
async function loadBookmarks(arrayBuffer) {
    try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        const outline = await pdf.getOutline();
        const select = document.getElementById('bookmark-list');
        select.innerHTML = '';

        if (!outline || outline.length === 0) {
            document.getElementById('bookmark-hint').textContent = 'Nessun segnalibro trovato in questo PDF.';
            return;
        }

        document.getElementById('bookmark-hint').textContent =
            `${outline.length} segnalibri trovati. Seleziona i punti di divisione:`;

        for (const item of outline) {
            const dest = await pdf.getDestination(
                typeof item.dest === 'string' ? item.dest : item.dest
            ).catch(() => null);

            let pageNum = '?';
            if (dest) {
                const ref = dest[0];
                pageNum = await pdf.getPageIndex(ref).then(i => i + 1).catch(() => '?');
            }

            const opt = document.createElement('option');
            opt.value = pageNum;
            opt.textContent = `${item.title} (pag. ${pageNum})`;
            select.appendChild(opt);
        }
    } catch (e) {
        console.warn('Bookmark load failed:', e);
    }
}

// ── Parse page ranges ─────────────────────────
function parseRanges(input, total) {
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);
    const pages = new Set();

    for (const part of parts) {
        if (part.includes('-')) {
            const [a, b] = part.split('-').map(Number);
            if (isNaN(a) || isNaN(b) || a < 1 || b > total || a > b) {
                throw new Error(`Intervallo non valido: "${part}"`);
            }
            for (let i = a; i <= b; i++) pages.add(i);
        } else {
            const n = Number(part);
            if (isNaN(n) || n < 1 || n > total) {
                throw new Error(`Pagina non valida: "${part}"`);
            }
            pages.add(n);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

// ── Build split segments ──────────────────────
function buildSegments(mode) {
    switch (mode) {
        case 'single':
            return Array.from({ length: totalPages }, (_, i) => [i + 1, i + 1]);

        case 'range': {
            const input = document.getElementById('range-input').value.trim();
            if (!input) throw new Error('Inserisci un intervallo');
            const pages = parseRanges(input, totalPages);
            return [[pages[0], pages[pages.length - 1]]];
        }

        case 'every': {
            const n = parseInt(document.getElementById('every-input').value);
            if (isNaN(n) || n < 1) throw new Error('Numero non valido');
            const segs = [];
            for (let i = 1; i <= totalPages; i += n) {
                segs.push([i, Math.min(i + n - 1, totalPages)]);
            }
            return segs;
        }

        case 'odd':
            return Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p % 2 !== 0).map(p => [p, p]);

        case 'even':
            return Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p % 2 === 0).map(p => [p, p]);

        case 'bookmark': {
            const sel = document.getElementById('bookmark-list');
            const selected = Array.from(sel.selectedOptions).map(o => parseInt(o.value)).filter(Boolean).sort((a, b) => a - b);
            if (selected.length === 0) throw new Error('Seleziona almeno un segnalibro');
            const segs = [];
            for (let i = 0; i < selected.length; i++) {
                const start = selected[i];
                const end = selected[i + 1] ? selected[i + 1] - 1 : totalPages;
                segs.push([start, end]);
            }
            return segs;
        }

        case 'selected': {
            const selected = pageCanvases
                .filter(w => w.classList.contains('selected'))
                .map(w => parseInt(w.dataset.page))
                .sort((a, b) => a - b);
            if (selected.length === 0) throw new Error('Seleziona almeno una pagina dall\'anteprima');
            return selected.map(p => [p, p]);
        }

        default:
            throw new Error('Modalità non riconosciuta');
    }
}

// ── Naming ────────────────────────────────────
function buildFilename(template, baseName, index, total, start, end) {
    const pad = String(index).padStart(String(total).length, '0');
    const date = new Date().toISOString().slice(0, 10);
    return template
        .replace('{name}', baseName)
        .replace('{index}', pad)
        .replace('{range}', start === end ? `p${start}` : `p${start}-${end}`)
        .replace('{date}', date)
        .replace('{total}', total) + '.pdf';
}

function updateNamingPreview() {
    const tpl = document.getElementById('naming-template').value || '{name}_{index}';
    const baseName = pdfFile ? pdfFile.name.replace(/\.pdf$/i, '') : 'documento';
    const preview = buildFilename(tpl, baseName, 1, 3, 1, 5);
    document.getElementById('naming-preview').textContent = `Es: ${preview}`;
}

// ── Split & Download ──────────────────────────
async function startSplit() {
    const activeMode = document.querySelector('.mode-tab.active')?.dataset.mode || 'single';
    const keepBookmarks = document.getElementById('keep-bookmarks').checked;
    const namingTpl = document.getElementById('naming-template').value || '{name}_{index}';
    const baseName = pdfFile.name.replace(/\.pdf$/i, '');

    let segments;
    try {
        segments = buildSegments(activeMode);
    } catch (e) {
        showToast(e.message, 'error');
        return;
    }

    if (segments.length === 0) {
        showToast('Nessuna pagina da estrarre.', 'error');
        return;
    }

    const btn = document.getElementById('split-btn');
    btn.disabled = true;
    showProgress(`Preparazione split (0/${segments.length})...`, 5);

    try {
        const zip = new JSZip();
        const originalBytes = await pdfFile.arrayBuffer();

        for (let i = 0; i < segments.length; i++) {
            const [start, end] = segments[i];
            const newPdf = await PDFDocument.create();
            const srcPdf = await PDFDocument.load(originalBytes);

            const indices = [];
            for (let p = start; p <= end; p++) indices.push(p - 1);

            const pages = await newPdf.copyPages(srcPdf, indices);
            pages.forEach(p => newPdf.addPage(p));

            // Copia metadati
            newPdf.setTitle(srcPdf.getTitle() || baseName);
            newPdf.setAuthor(srcPdf.getAuthor() || 'Btoolsify');
            newPdf.setCreator('Btoolsify Split PDF Tool');

            const bytes = await newPdf.save({ useObjectStreams: false });
            const filename = buildFilename(namingTpl, baseName, i + 1, segments.length, start, end);
            zip.file(filename, bytes);

            const pct = Math.round(((i + 1) / segments.length) * 90) + 5;
            showProgress(`Generazione file ${i + 1}/${segments.length}...`, pct);
        }

        showProgress('Creazione ZIP...', 97);
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_split.zip`;
        a.click();
        URL.revokeObjectURL(url);

        hideProgress();
        showToast(`✅ ${segments.length} file creati e scaricati!`, 'success');

    } catch (err) {
        hideProgress();
        showToast('Errore durante lo split: ' + err.message, 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
    }
}

// ── Presets ───────────────────────────────────
function savePreset() {
    const activeMode = document.querySelector('.mode-tab.active')?.dataset.mode || 'single';
    const name = prompt('Nome preset:');
    if (!name) return;

    const config = { mode: activeMode, naming: document.getElementById('naming-template').value };
    if (activeMode === 'range') config.range = document.getElementById('range-input').value;
    if (activeMode === 'every') config.every = document.getElementById('every-input').value;

    savedPresets.push({ name, config });
    localStorage.setItem('splitPresets', JSON.stringify(savedPresets));
    renderPresets();
    showToast('Preset salvato!', 'success');
}

function loadPreset(index) {
    const p = savedPresets[index];
    if (!p) return;
    const { config } = p;

    document.querySelectorAll('.mode-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.mode === config.mode);
    });
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === 'panel-' + config.mode);
    });

    if (config.naming) document.getElementById('naming-template').value = config.naming;
    if (config.range) document.getElementById('range-input').value = config.range;
    if (config.every) document.getElementById('every-input').value = config.every;

    updateNamingPreview();
    showToast(`Preset "${p.name}" caricato!`, 'success');
}

function deletePreset(index) {
    savedPresets.splice(index, 1);
    localStorage.setItem('splitPresets', JSON.stringify(savedPresets));
    renderPresets();
}

function renderPresets() {
    const container = document.getElementById('presets-list');
    if (!container) return;
    if (savedPresets.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">Nessun preset salvato.</p>';
        return;
    }
    container.innerHTML = savedPresets.map((p, i) => `
        <div class="preset-item">
            <span onclick="loadPreset(${i})">${p.name} <small>(${p.config.mode})</small></span>
            <button onclick="deletePreset(${i})" aria-label="Elimina preset"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

// ── Select all / none ─────────────────────────
function selectAll() { pageCanvases.forEach(w => w.classList.add('selected')); }
function selectNone() { pageCanvases.forEach(w => w.classList.remove('selected')); }

// ── UI helpers ────────────────────────────────
function showToolArea() {
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('tool-area').style.display = 'block';
}

function resetTool() {
    pdfFile = null; pdfDoc = null; totalPages = 0; pageCanvases = [];
    document.getElementById('upload-zone').style.display = '';
    document.getElementById('tool-area').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('page-previews').innerHTML = '';
}

function showProgress(msg, pct) {
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    const wrap = document.getElementById('progress-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    label.textContent = msg;
    bar.style.width = pct + '%';
}

function hideProgress() {
    const wrap = document.getElementById('progress-wrap');
    if (wrap) wrap.style.display = 'none';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showToast(message, type = 'success') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type); return;
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
        background:${type === 'error' ? '#ef4444' : '#059669'};
        color:white;padding:14px 28px;border-radius:50px;
        font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}