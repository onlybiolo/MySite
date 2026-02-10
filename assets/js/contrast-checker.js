document.addEventListener('DOMContentLoaded', () => {
    /* --- ELEMENTS --- */
    const bgColorHex = document.getElementById('bg-color-hex');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const textColorHex = document.getElementById('text-color-hex');
    const textColorPicker = document.getElementById('text-color-picker');

    const contrastRatioDisplay = document.getElementById('contrast-ratio');
    const previewBox = document.getElementById('preview-box');

    const swapBtn = document.getElementById('swap-colors');
    const copyBtn = document.getElementById('copy-summary');

    const wcagItems = {
        normalAA: document.getElementById('normal-aa'),
        largeAA: document.getElementById('large-aa'),
        normalAAA: document.getElementById('normal-aaa'),
        largeAAA: document.getElementById('large-aaa')
    };

    /* --- MATH UTILS --- */

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function getLuminance(rgb) {
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function calculateRatio(color1, color2) {
        const lum1 = getLuminance(hexToRgb(color1));
        const lum2 = getLuminance(hexToRgb(color2));
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    }

    /* --- UI UPDATES --- */

    function updateApp() {
        const bg = bgColorHex.value;
        const text = textColorHex.value;

        // Update colors
        previewBox.style.backgroundColor = bg;
        previewBox.style.color = text;

        // Calculate
        const ratio = calculateRatio(bg, text);
        contrastRatioDisplay.innerText = ratio.toFixed(2) + ':1';

        // WCAG Checks
        checkWCAG(ratio);

        // Save State
        localStorage.setItem('contrast-bg', bg);
        localStorage.setItem('contrast-text', text);
    }

    function checkWCAG(ratio) {
        const results = {
            normalAA: ratio >= 4.5,
            largeAA: ratio >= 3,
            normalAAA: ratio >= 7,
            largeAAA: ratio >= 4.5
        };

        Object.keys(results).forEach(key => {
            const el = wcagItems[key];
            const pass = results[key];
            const statusEl = el.querySelector('.wcag-status');

            el.className = `wcag-item ${pass ? 'pass' : 'fail'}`;

            let message = '';
            if (key.includes('normalAA') && pass) message = 'Ottimo';
            else if (key.includes('AAA') && pass) message = 'Massimo';
            else if (pass) message = 'Passa';
            else message = 'Fallito';

            statusEl.innerHTML = pass
                ? `<i class="fas fa-check-circle pass-icon"></i> ${message}`
                : `<i class="fas fa-times-circle fail-icon"></i> Fallito`;
        });
    }

    /* --- EVENT LISTENERS --- */

    function syncInputs(hexInput, pickerInput) {
        hexInput.addEventListener('input', (e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (val.length === 7) {
                pickerInput.value = val;
                updateApp();
            }
        });

        pickerInput.addEventListener('input', (e) => {
            hexInput.value = e.target.value.toUpperCase();
            updateApp();
        });
    }

    syncInputs(bgColorHex, bgColorPicker);
    syncInputs(textColorHex, textColorPicker);

    swapBtn.addEventListener('click', () => {
        const temp = bgColorHex.value;
        bgColorHex.value = textColorHex.value;
        textColorHex.value = temp;

        bgColorPicker.value = bgColorHex.value;
        textColorPicker.value = textColorHex.value;

        updateApp();
    });

    copyBtn.addEventListener('click', () => {
        const text = `Background: ${bgColorHex.value} | Text: ${textColorHex.value} | Ratio: ${contrastRatioDisplay.innerText}`;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiato!';
            setTimeout(() => copyBtn.innerHTML = originalText, 2000);
        });
    });

    /* --- INIT --- */
    const savedBg = localStorage.getItem('contrast-bg');
    const savedText = localStorage.getItem('contrast-text');

    if (savedBg) {
        bgColorHex.value = savedBg;
        bgColorPicker.value = savedBg;
    }
    if (savedText) {
        textColorHex.value = savedText;
        textColorPicker.value = savedText;
    }

    updateApp();
});
