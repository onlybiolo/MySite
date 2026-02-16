// ============================================
// Btoolsify — Case Converter
// All processing client-side, zero server calls
// ============================================

(function () {
    'use strict';

    // ── State ─────────────────────────────────
    var liveMode = true;
    var currentMode = null;
    var debounceTimer = null;

    // Small words to skip in Title Case (except first/last)
    var SMALL_WORDS = new Set([
        'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor',
        'of', 'in', 'to', 'on', 'at', 'by', 'with', 'is',
        'it', 'as', 'if', 'so', 'yet', 'vs', 'via'
    ]);

    // ── DOM refs ──────────────────────────────
    var inputEl, outputEl, statsEls, liveModeToggle, convertBtn;

    document.addEventListener('DOMContentLoaded', function () {
        inputEl = document.getElementById('cc-input');
        outputEl = document.getElementById('cc-output');
        liveModeToggle = document.getElementById('live-toggle');
        convertBtn = document.getElementById('convert-btn');

        statsEls = {
            chars: document.getElementById('st-chars'),
            charsNs: document.getElementById('st-chars-ns'),
            words: document.getElementById('st-words'),
            sentences: document.getElementById('st-sentences'),
            lines: document.getElementById('st-lines'),
            readTime: document.getElementById('st-read'),
            speakTime: document.getElementById('st-speak')
        };

        // Input listener
        inputEl.addEventListener('input', function () {
            updateStats();
            if (liveMode && currentMode) {
                scheduleConvert();
            }
        });

        // Mode buttons
        document.querySelectorAll('[data-case]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setActiveMode(this);
                runConversion(this.dataset.case);
            });
        });

        // Utility buttons
        document.querySelectorAll('[data-util]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                currentMode = null;
                clearActiveModes();
                runUtility(this.dataset.util);
            });
        });

        // Live mode toggle
        if (liveModeToggle) {
            liveModeToggle.addEventListener('click', function () {
                liveMode = !liveMode;
                this.classList.toggle('on', liveMode);
                convertBtn.style.display = liveMode ? 'none' : '';
            });
        }

        // Convert button (manual mode)
        if (convertBtn) {
            convertBtn.addEventListener('click', function () {
                if (currentMode) runConversion(currentMode);
            });
            convertBtn.style.display = 'none'; // hidden in live mode by default
        }

        updateStats();
    });

    // ── Active mode UI ────────────────────────
    function setActiveMode(btn) {
        clearActiveModes();
        btn.classList.add('active');
        currentMode = btn.dataset.case;
    }

    function clearActiveModes() {
        document.querySelectorAll('[data-case].active').forEach(function (b) {
            b.classList.remove('active');
        });
    }

    // ── Debounced convert ─────────────────────
    function scheduleConvert() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            if (currentMode) runConversion(currentMode);
        }, 120);
    }

    // ═══════════════════════════════════════════
    //  CASE CONVERSIONS
    // ═══════════════════════════════════════════

    function runConversion(mode) {
        var text = inputEl.value;
        var result = '';

        switch (mode) {
            case 'upper': result = text.toUpperCase(); break;
            case 'lower': result = text.toLowerCase(); break;
            case 'title': result = toTitleCase(text); break;
            case 'sentence': result = toSentenceCase(text); break;
            case 'camel': result = toCamelCase(text); break;
            case 'pascal': result = toPascalCase(text); break;
            case 'snake': result = toSnakeCase(text); break;
            case 'screaming': result = toScreamingSnake(text); break;
            case 'kebab': result = toKebabCase(text); break;
            case 'train': result = toTrainCase(text); break;
            case 'dot': result = toDotCase(text); break;
            // Pro modes
            case 'slug': result = toSlug(text); break;
            case 'constant': result = toScreamingSnake(text); break;
            case 'variable': result = toCamelCase(text); break;
            case 'classname': result = toPascalCase(text); break;
            default: result = text;
        }

        outputEl.value = result;
    }

    // ── Title Case (smart) ────────────────────
    function toTitleCase(str) {
        return str.replace(/[^\s]+/g, function (word, index) {
            // Preserve acronyms (all-caps words with 2+ chars)
            if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
                return word;
            }
            var lower = word.toLowerCase();
            // Always capitalize first and last word
            if (index === 0) return capitalize(lower);
            // Skip small words (unless after punctuation like : or -)
            if (SMALL_WORDS.has(lower.replace(/[^a-z]/g, ''))) {
                // Capitalize if after colon, dash, or is first word
                var before = str.charAt(index - 1);
                if (before === ':' || before === '-' || before === '—') {
                    return capitalize(lower);
                }
                return lower;
            }
            return capitalize(lower);
        });
    }

    // ── Sentence case ─────────────────────────
    function toSentenceCase(str) {
        return str.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-zà-ú])/g, function (m, sep, ch) {
            return sep + ch.toUpperCase();
        });
    }

    // ── camelCase ─────────────────────────────
    function toCamelCase(str) {
        var words = splitToWords(str);
        if (words.length === 0) return '';
        return words[0].toLowerCase() + words.slice(1).map(function (w) {
            return capitalize(w.toLowerCase());
        }).join('');
    }

    // ── PascalCase ────────────────────────────
    function toPascalCase(str) {
        return splitToWords(str).map(function (w) {
            return capitalize(w.toLowerCase());
        }).join('');
    }

    // ── snake_case ────────────────────────────
    function toSnakeCase(str) {
        return splitToWords(str).map(function (w) { return w.toLowerCase(); }).join('_');
    }

    // ── SCREAMING_SNAKE_CASE ──────────────────
    function toScreamingSnake(str) {
        return splitToWords(str).map(function (w) { return w.toUpperCase(); }).join('_');
    }

    // ── kebab-case ────────────────────────────
    function toKebabCase(str) {
        return splitToWords(str).map(function (w) { return w.toLowerCase(); }).join('-');
    }

    // ── Train-Case ────────────────────────────
    function toTrainCase(str) {
        return splitToWords(str).map(function (w) {
            return capitalize(w.toLowerCase());
        }).join('-');
    }

    // ── dot.case ──────────────────────────────
    function toDotCase(str) {
        return splitToWords(str).map(function (w) { return w.toLowerCase(); }).join('.');
    }

    // ── Slug ──────────────────────────────────
    function toSlug(str) {
        return str
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
            .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
            .replace(/\s+/g, '-')            // spaces → hyphens
            .replace(/-+/g, '-')             // collapse multiple hyphens
            .replace(/^-|-$/g, '');           // trim leading/trailing hyphens
    }

    // ── Word splitter (handles camelCase, snake, kebab, dots, spaces) ──
    function splitToWords(str) {
        return str
            // Insert space before uppercase letters in camelCase
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // Split on non-alphanumeric
            .split(/[^a-zA-ZÀ-ÿ0-9]+/)
            .filter(function (w) { return w.length > 0; });
    }

    function capitalize(w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
    }

    // ═══════════════════════════════════════════
    //  UTILITY TRANSFORMATIONS
    // ═══════════════════════════════════════════

    function runUtility(util) {
        var text = inputEl.value;
        var result = '';

        switch (util) {
            case 'trim':
                result = text.trim(); break;
            case 'extra-spaces':
                result = text.replace(/ {2,}/g, ' '); break;
            case 'remove-breaks':
                result = text.replace(/[\r\n]+/g, ' '); break;
            case 'breaks-to-comma':
                result = text.split(/[\r\n]+/).filter(Boolean).join(', '); break;
            case 'remove-punctuation':
                result = text.replace(/[^\w\sÀ-ÿ]/g, ''); break;
            case 'remove-numbers':
                result = text.replace(/[0-9]/g, ''); break;
            case 'remove-special':
                result = text.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ''); break;
            case 'reverse-text':
                result = text.split('').reverse().join(''); break;
            case 'reverse-words':
                result = text.split(/\s+/).reverse().join(' '); break;
            case 'sort-words':
                result = text.split(/\s+/).filter(Boolean).sort(function (a, b) {
                    return a.localeCompare(b, 'it', { sensitivity: 'base' });
                }).join(' '); break;
            case 'randomize-words':
                var arr = text.split(/\s+/).filter(Boolean);
                for (var i = arr.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
                }
                result = arr.join(' '); break;
            case 'dedupe-lines':
                var seen = new Set();
                result = text.split('\n').filter(function (line) {
                    var trimmed = line.trim();
                    if (trimmed === '') return true;
                    if (seen.has(trimmed)) return false;
                    seen.add(trimmed);
                    return true;
                }).join('\n'); break;
            // Social media
            case 'remove-emojis':
                result = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').replace(/ {2,}/g, ' ').trim(); break;
            case 'to-hashtags':
                result = text.split(/\s+/).filter(Boolean).map(function (w) {
                    return '#' + w.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '');
                }).join(' '); break;
            case 'remove-hashtags':
                result = text.replace(/#(\w+)/g, '$1'); break;
            case 'twitter-safe':
                result = text.length > 280 ? text.substring(0, 277) + '...' : text; break;
            // Programming helpers
            case 'quote-lines':
                result = text.split('\n').map(function (l) { return '"' + l + '"'; }).join('\n'); break;
            case 'comma-lines':
                result = text.split('\n').filter(function (l) { return l.trim(); }).join(',\n'); break;
            case 'array-wrap':
                var lines = text.split('\n').filter(function (l) { return l.trim(); });
                result = '[\n' + lines.map(function (l) {
                    return '  "' + l.trim().replace(/"/g, '\\"') + '"';
                }).join(',\n') + '\n]'; break;
            default:
                result = text;
        }

        outputEl.value = result;
    }

    // ═══════════════════════════════════════════
    //  REAL-TIME STATS
    // ═══════════════════════════════════════════

    function updateStats() {
        var text = inputEl.value;

        var chars = text.length;
        var charsNs = text.replace(/\s/g, '').length;
        var words = text.trim() ? text.trim().split(/\s+/).length : 0;
        var sentences = text.trim() ? (text.match(/[.!?…]+(\s|$)/g) || []).length || (text.trim() ? 1 : 0) : 0;
        var lines = text ? text.split('\n').length : 0;

        // Reading time (~238 wpm avg)
        var readMin = Math.ceil(words / 238);
        var readStr = readMin < 1 ? '< 1 min' : readMin + ' min';

        // Speaking time (~150 wpm avg)
        var speakMin = Math.ceil(words / 150);
        var speakStr = speakMin < 1 ? '< 1 min' : speakMin + ' min';

        if (statsEls.chars) statsEls.chars.textContent = formatNum(chars);
        if (statsEls.charsNs) statsEls.charsNs.textContent = formatNum(charsNs);
        if (statsEls.words) statsEls.words.textContent = formatNum(words);
        if (statsEls.sentences) statsEls.sentences.textContent = formatNum(sentences);
        if (statsEls.lines) statsEls.lines.textContent = formatNum(lines);
        if (statsEls.readTime) statsEls.readTime.textContent = readStr;
        if (statsEls.speakTime) statsEls.speakTime.textContent = speakStr;
    }

    function formatNum(n) {
        return n.toLocaleString('it-IT');
    }

    // ═══════════════════════════════════════════
    //  CLIPBOARD & ACTIONS (global)
    // ═══════════════════════════════════════════

    window.ccCopyOutput = function () {
        if (!outputEl.value) return;
        navigator.clipboard.writeText(outputEl.value).then(function () {
            showToast('Output copiato!', 'success');
        }).catch(function () {
            fallbackCopy(outputEl);
        });
    };

    window.ccCopyInput = function () {
        if (!inputEl.value) return;
        navigator.clipboard.writeText(inputEl.value).then(function () {
            showToast('Input copiato!', 'success');
        }).catch(function () {
            fallbackCopy(inputEl);
        });
    };

    window.ccPaste = function () {
        navigator.clipboard.readText().then(function (text) {
            inputEl.value = text;
            inputEl.dispatchEvent(new Event('input'));
            showToast('Testo incollato!', 'success');
        }).catch(function () {
            showToast('Permesso appunti negato', 'error');
        });
    };

    window.ccClear = function () {
        inputEl.value = '';
        outputEl.value = '';
        currentMode = null;
        clearActiveModes();
        updateStats();
        showToast('Tutto cancellato', 'success');
    };

    window.ccDownload = function () {
        var text = outputEl.value || inputEl.value;
        if (!text) { showToast('Nessun testo da scaricare', 'error'); return; }
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'btoolsify-text.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('File scaricato!', 'success');
    };

    window.ccSwap = function () {
        var tmp = inputEl.value;
        inputEl.value = outputEl.value;
        outputEl.value = tmp;
        updateStats();
        showToast('Input ↔ Output scambiati', 'success');
    };

    function fallbackCopy(el) {
        el.select();
        document.execCommand('copy');
        showToast('Copiato!', 'success');
    }

    // ═══════════════════════════════════════════
    //  TOAST NOTIFICATION
    // ═══════════════════════════════════════════

    function showToast(message, type) {
        var existing = document.querySelector('.cc-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'cc-toast cc-toast-' + (type || 'success');
        toast.innerHTML = '<i class="fas fa-' + (type === 'error' ? 'exclamation-circle' : 'check-circle') + '"></i> ' + message;
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('show');
        });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 2200);
    }

})();
