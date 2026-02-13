// ============================================
// Btoolsify - Merge PDF Tool
// ============================================

const { PDFDocument } = PDFLib;

let files = []; // Array of { file, arrayBuffer }
let sortable;

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('upload-zone');

    // File input change
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Drag & Drop on upload zone
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // Click on upload zone (not on button)
    uploadZone.addEventListener('click', (e) => {
        if (e.target.closest('.btn-upload')) return;
        fileInput.click();
    });

    // Init SortableJS on file list
    sortable = new Sortable(document.getElementById('file-list'), {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: syncFilesOrder
    });
});

// ── Handle incoming files ─────────────────────
async function handleFiles(fileList) {
    const pdfs = Array.from(fileList).filter(f => f.type === 'application/pdf');

    if (pdfs.length === 0) {
        showToast('Seleziona solo file PDF!', 'error');
        return;
    }

    for (const file of pdfs) {
        const arrayBuffer = await file.arrayBuffer();
        files.push({ file, arrayBuffer });
    }

    renderFileList();
    showPreviewArea();
}

// ── Render file list ──────────────────────────
function renderFileList() {
    const list = document.getElementById('file-list');
    const count = document.getElementById('file-count');

    list.innerHTML = '';
    count.textContent = `(${files.length})`;

    files.forEach((item, index) => {
        const size = formatSize(item.file.size);
        const li = document.createElement('li');
        li.className = 'file-item';
        li.dataset.index = index;
        li.innerHTML = `
            <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
            <i class="fas fa-file-pdf file-icon"></i>
            <div class="file-info">
                <span class="file-name">${escapeHtml(item.file.name)}</span>
                <span class="file-meta">${size}</span>
            </div>
            <button class="remove-btn" onclick="removeFile(${index})" aria-label="Rimuovi file">
                <i class="fas fa-times"></i>
            </button>
        `;
        list.appendChild(li);
    });
}

// ── Remove a file ─────────────────────────────
function removeFile(index) {
    files.splice(index, 1);
    if (files.length === 0) {
        hidePreviewArea();
    } else {
        renderFileList();
    }
}

// ── Sync files array after drag reorder ───────
function syncFilesOrder() {
    const list = document.getElementById('file-list');
    const items = Array.from(list.querySelectorAll('.file-item'));
    const newFiles = items.map(item => files[parseInt(item.dataset.index)]);
    files = newFiles;
    renderFileList();
}

// ── Merge PDFs ────────────────────────────────
async function mergePDFs() {
    if (files.length < 2) {
        showToast('Aggiungi almeno 2 file PDF!', 'error');
        return;
    }

    const btn = document.getElementById('mergeBtn');
    const spinner = document.getElementById('loadingSpinner');

    btn.disabled = true;
    spinner.style.display = 'inline-block';

    try {
        const mergedPdf = await PDFDocument.create();

        for (const item of files) {
            const pdf = await PDFDocument.load(item.arrayBuffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        downloadPDF(mergedBytes, 'btoolsify-merged.pdf');
        showToast('PDF uniti con successo!', 'success');

    } catch (err) {
        console.error(err);
        showToast('Errore durante l\'unione. Verifica che i PDF non siano protetti.', 'error');
    } finally {
        btn.disabled = false;
        spinner.style.display = 'none';
    }
}

// ── Download helper ───────────────────────────
function downloadPDF(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── UI helpers ────────────────────────────────
function showPreviewArea() {
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('preview-area').style.display = 'block';
}

function hidePreviewArea() {
    document.getElementById('upload-zone').style.display = '';
    document.getElementById('preview-area').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message, type = 'success') {
    // Usa il sistema toast del main.js se esiste, altrimenti fallback
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    // Fallback semplice
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: ${type === 'error' ? '#ef4444' : '#059669'};
        color: white; padding: 14px 28px; border-radius: 50px;
        font-weight: 600; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}