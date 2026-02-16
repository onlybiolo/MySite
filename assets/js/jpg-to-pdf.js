document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('fileInput');
    const previewArea = document.getElementById('preview-area');
    const previewGrid = document.getElementById('preview-grid');
    const convertBtn = document.getElementById('convertBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const btnText = convertBtn.querySelector('span');

    let files = []; // Array to store File objects

    // --- Drag & Drop ---
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    uploadZone.addEventListener('click', (e) => {
        // Only trigger input click if the user didn't click on a button inside (if any)
        if (e.target === uploadZone || e.target.closest('.upload-text') || e.target.classList.contains('upload-icon')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // --- Helper Functions ---
    function handleFiles(newFiles) {
        if (newFiles.length > 0) {
            // Convert FileList to Array and filter images
            const validFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));

            if (validFiles.length === 0) {
                alert('Per favore seleziona solo file immagine (JPG, PNG, WEBP).');
                return;
            }

            files = [...files, ...validFiles];
            updatePreview();
        }
    }

    function updatePreview() {
        if (files.length > 0) {
            previewArea.style.display = 'block';
            uploadZone.style.display = 'none'; // Hide upload zone once files are added, use "Add" button instead
        } else {
            previewArea.style.display = 'none';
            uploadZone.style.display = 'block';
        }

        previewGrid.innerHTML = ''; // Clear current

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.draggable = true; // Enable native drag for sorting if Sortable fails (backup)
                div.dataset.index = index;

                div.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="page-number">Pag. ${index + 1}</div>
                    <button class="remove-btn" onclick="removeFile(${index})" title="Rimuovi">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        // Initialize SortableJS for reordering
        if (typeof Sortable !== 'undefined') {
            new Sortable(previewGrid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function (evt) {
                    // Update 'files' array based on new order
                    const itemEl = evt.item;  // dragged HTMLElement
                    const newIndex = evt.newIndex; // New index
                    const oldIndex = evt.oldIndex; // Old index

                    // Move element in array
                    const movedFile = files.splice(oldIndex, 1)[0];
                    files.splice(newIndex, 0, movedFile);

                    // Re-render to update page numbers
                    updatePreview();
                },
            });
        }
    }

    // Expose specific function to window for inline onclick
    window.removeFile = function (index) {
        files.splice(index, 1);
        updatePreview();
    };

    window.convertToPDF = async function () {
        if (files.length === 0) {
            alert("Carica almeno un'immagine!");
            return;
        }

        // Real Data Tracking
        if (typeof trackUsage === 'function') {
            trackUsage('jpg-to-pdf', 'JPG to PDF');
        }

        // UI Loading State
        convertBtn.disabled = true;
        btnText.textContent = "Generazione PDF...";
        loadingSpinner.style.display = 'inline-block';

        // Allow UI to update before heavy processing
        setTimeout(async () => {
            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();

                // Settings
                const pageSize = document.getElementById('pageSize').value; // a4, letter, fit
                const orientation = document.getElementById('orientation').value; // p, l
                const marginSetting = document.getElementById('margin').value; // none, small, big

                // Define margins
                let margin = 0;
                if (marginSetting === 'small') margin = 10;
                if (marginSetting === 'big') margin = 20;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const imgData = await readFileAsDataURL(file);

                    // Get image dimensions
                    const imgProps = await getImageProperties(imgData);

                    // Calculate PDF page size
                    let pdfWidth, pdfHeight;

                    // If not first page, add new page
                    if (i > 0) pdf.addPage();

                    // Logic for "Fit to Image" vs "A4/Letter"
                    if (pageSize === 'fit') {
                        // Set page size to image size (converted to pt or mm)
                        // jsPDF default unit is mm. 1px approx 0.264583 mm
                        const pxToMm = 0.264583;
                        pdfWidth = imgProps.width * pxToMm;
                        pdfHeight = imgProps.height * pxToMm;

                        pdf.deletePage(i + 1); // Remove default A4 page added by addPage() or init
                        pdf.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'l' : 'p');

                        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                    } else {
                        // Standard Page Sizes (A4, Letter)
                        // A4: 210 x 297 mm
                        // Letter: 215.9 x 279.4 mm
                        let pageW = 210;
                        let pageH = 297;

                        if (pageSize === 'letter') {
                            pageW = 215.9;
                            pageH = 279.4;
                        }

                        // Handle Orientation
                        if (orientation === 'l') {
                            [pageW, pageH] = [pageH, pageW]; // Swap
                            pdf.deletePage(i + 1);
                            pdf.addPage(pageSize, 'l');
                        } else {
                            // Ensure portrait if standard
                            if (i > 0 || pageSize !== 'a4') { // First page is A4 portrait by default
                                pdf.deletePage(i + 1);
                                pdf.addPage(pageSize, 'p');
                            }
                        }

                        // Calculate Image Dimensions to fit within margins
                        const usableW = pageW - (margin * 2);
                        const usableH = pageH - (margin * 2);

                        const ratio = Math.min(usableW / imgProps.width, usableH / imgProps.height);

                        // New Dimensions
                        const finalW = imgProps.width * ratio; // These are in 'pdf units' if ratio is correct?? No.
                        // Wait. imgProps are in PX. usableW is in MM.
                        // We need to convert image PX to MM first? No, jsPDF handles scaling if we just give it destination width/height.

                        // Let's rely on ratio.
                        // If we say: Image 1000px wide. Page 200mm wide.
                        // We want image to be 200mm wide.
                        // addImage(data, fmt, x, y, w, h)

                        // Simply: Fit image into [usableW, usableH] box, centered.
                        const imgRatio = imgProps.width / imgProps.height;
                        const pageRatio = usableW / usableH;

                        let renderW, renderH;

                        if (imgRatio > pageRatio) {
                            // Image is wider than page area -> constrain by width
                            renderW = usableW;
                            renderH = usableW / imgRatio;
                        } else {
                            // Image is taller -> constrain by height
                            renderH = usableH;
                            renderW = usableH * imgRatio;
                        }

                        // Center the image
                        const x = margin + (usableW - renderW) / 2;
                        const y = margin + (usableH - renderH) / 2;

                        pdf.addImage(imgData, 'JPEG', x, y, renderW, renderH);
                    }
                }

                pdf.save('immagini-convertite.pdf');

            } catch (err) {
                console.error(err);
                alert('Si è verificato un errore durante la conversione. Riprova con immagini più piccole.');
            } finally {
                // Reset UI
                convertBtn.disabled = false;
                btnText.textContent = "Converti in PDF";
                loadingSpinner.style.display = 'none';
            }
        }, 100);
    };

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getImageProperties(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

});
