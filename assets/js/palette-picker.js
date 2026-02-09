document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const vibeInput = document.getElementById('vibe-input');
    const generateBtn = document.getElementById('generate-btn');
    const paletteDisplay = document.getElementById('palette-display');
    const vibeChips = document.querySelectorAll('.vibe-chip');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const autocompleteDropdown = document.getElementById('vibe-autocomplete');
    const formatBtns = document.querySelectorAll('.format-btn');
    const toast = document.getElementById('toast');

    // State
    let currentColors = [];
    let currentFormat = 'hex';
    let paletteDataset = [];

    // --- DATA LOADING ---
    async function loadPaletteData() {
        if (window.paletteDatasetStore && window.paletteDatasetStore.palettes) {
            paletteDataset = window.paletteDatasetStore.palettes;
            generateFromVibe('Nordic Chill');
        } else {
            console.error('Palette dataset store not found');
            paletteDataset = [{ name: 'Nordic Chill', colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'] }];
            generateFromVibe('Nordic Chill');
        }
        initVibeChips();
    }
    loadPaletteData();

    function initVibeChips() {
        if (paletteDataset.length === 0) return;
        const randomSamples = [...paletteDataset].sort(() => 0.5 - Math.random()).slice(0, 5);
        const container = document.querySelector('.vibe-chips');
        if (!container) return;
        container.innerHTML = '';
        randomSamples.forEach(sample => {
            const chip = document.createElement('span');
            chip.className = 'vibe-chip';
            chip.textContent = sample.name;
            chip.onclick = () => {
                vibeInput.value = sample.name;
                currentColors = sample.colors;
                renderPalette();
                autocompleteDropdown.classList.add('hidden');
            };
            container.appendChild(chip);
        });
    }


    // --- MODE SWITCHING ---
    window.switchMode = function (mode) {
        document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.picker-section').forEach(s => s.classList.add('hidden'));

        const activeTab = Array.from(document.querySelectorAll('.tool-tab')).find(t =>
            t.getAttribute('onclick').includes(mode)
        );
        if (activeTab) activeTab.classList.add('active');

        const sectionId = mode === 'mood' ? 'section-mood' : 'section-image';
        document.getElementById(sectionId).classList.remove('hidden');
    };

    // --- MOOD GENERATION ---
    function generateFromVibe(vibe = '') {
        const query = vibe.toLowerCase().trim();
        if (!query) return;

        // 1. Search for EXACT match in the global dataset
        const exactMatch = paletteDataset.find(p => p.name.toLowerCase() === query);
        if (exactMatch) {
            currentColors = exactMatch.colors;
            renderPalette();
            return;
        }

        // 2. Search for PARTIAL match in the global dataset
        const partialMatch = paletteDataset.find(p => p.name.toLowerCase().includes(query));
        if (partialMatch) {
            currentColors = partialMatch.colors;
            renderPalette();
            return;
        }

        // 3. Fallback to heuristic generation
        const hash = Array.from(query).reduce((acc, char) => acc + char.charCodeAt(0), 0) || Math.random() * 360;
        const baseHue = hash % 360;
        currentColors = [
            `hsl(${baseHue}, 70%, 25%)`,
            `hsl(${baseHue}, 50%, 45%)`,
            `hsl(${(baseHue + 40) % 360}, 60%, 65%)`,
            `hsl(${(baseHue + 180) % 360}, 75%, 55%)`,
            `hsl(${(baseHue + 210) % 360}, 40%, 85%)`
        ].map(hslToHex);
        renderPalette();
    }

    // --- IMAGE PROCESSING ---
    imageInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.classList.remove('hidden');
            extractColors(event.target.result);
        };
        reader.readAsDataURL(file);
    });

    function extractColors(src) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 50; canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);
            const data = ctx.getImageData(0, 0, 50, 50).data;

            const counts = {};
            for (let i = 0; i < data.length; i += 16) {
                const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
                counts[hex] = (counts[hex] || 0) + 1;
            }

            currentColors = Object.keys(counts)
                .sort((a, b) => counts[b] - counts[a])
                .slice(0, 5);

            while (currentColors.length < 5) currentColors.push('#ffffff');
            renderPalette();
        };
        img.src = src;
    }

    // --- RENDERING ---
    function renderPalette() {
        paletteDisplay.innerHTML = '';
        currentColors.forEach(color => {
            const hex = color.startsWith('rgb') ? rgbToHex(...color.match(/\d+/g).map(Number)) : color;
            const rgb = hexToRgb(hex);
            const isDark = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) < 150;

            const card = document.createElement('div');
            card.className = `color-card ${isDark ? 'dark-text' : ''}`;
            card.style.backgroundColor = hex;

            const displayValue = currentFormat === 'hex' ? hex.toUpperCase() : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

            card.innerHTML = `
                <div class="color-info">
                    <span class="hex-value">${displayValue}</span>
                    <span class="rgb-value">Clicca per copiare</span>
                </div>
            `;

            card.onclick = () => copyToClipboard(displayValue);
            paletteDisplay.appendChild(card);
        });
    }

    // --- HELPERS ---
    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    function hslToHex(hsl) {
        const d = document.createElement('div');
        d.style.color = hsl;
        document.body.appendChild(d);
        const rgb = getComputedStyle(d).color.match(/\d+/g).map(Number);
        document.body.removeChild(d);
        return rgbToHex(rgb[0], rgb[1], rgb[2]);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            toast.textContent = `Copiato: ${text}`;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        });
    }

    // --- LISTENERS ---
    vibeInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase().trim();
        if (!value) {
            autocompleteDropdown.classList.add('hidden');
            return;
        }

        const matches = paletteDataset
            .filter(p => p.name.toLowerCase().includes(value))
            .sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aStartsWith = aName.startsWith(value);
                const bStartsWith = bName.startsWith(value);
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;
                return aName.localeCompare(bName);
            })
            .slice(0, 7); // Limit to top 7 results for best balance

        if (matches.length > 0) {
            renderAutocomplete(matches);
            autocompleteDropdown.classList.remove('hidden');
        } else {
            autocompleteDropdown.classList.add('hidden');
        }
    });

    function renderAutocomplete(matches) {
        autocompleteDropdown.innerHTML = '';
        matches.forEach(match => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            // First color as primary swatch
            const primaryColor = match.colors[0];

            item.innerHTML = `
                <div class="color-swatch-sm" style="background-color: ${primaryColor}"></div>
                <span class="suggestion-name">${match.name}</span>
                <div class="suggestion-colors">
                    ${match.colors.slice(0, 5).map(c => `<div class="mini-dot" style="background-color: ${c}"></div>`).join('')}
                </div>
            `;

            item.onclick = () => {
                vibeInput.value = match.name;
                currentColors = match.colors;
                renderPalette();
                autocompleteDropdown.classList.add('hidden');
            };
            autocompleteDropdown.appendChild(item);
        });
    }

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!vibeInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.add('hidden');
        }
    });

    generateBtn.onclick = () => {
        const query = vibeInput.value.trim();
        const match = paletteDataset.find(p => p.name.toLowerCase() === query.toLowerCase());
        if (match) {
            currentColors = match.colors;
            renderPalette();
        } else {
            generateFromVibe(query);
        }
        autocompleteDropdown.classList.add('hidden');
    };

    vibeChips.forEach(chip => {
        // This is now handled by initVibeChips(), keeping as fallback
        chip.onclick = () => {
            vibeInput.value = chip.textContent;
            generateFromVibe(chip.textContent);
        };
    });

    formatBtns.forEach(btn => {
        btn.onclick = () => {
            formatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFormat = btn.dataset.format;
            renderPalette();
        };
    });

    copyAllBtn.onclick = () => {
        const text = currentColors.map(c => {
            const rgb = hexToRgb(c);
            return currentFormat === 'hex' ? c.toUpperCase() : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }).join(', ');
        copyToClipboard(text);
    };

    // Init is now handled within loadPaletteData
});
