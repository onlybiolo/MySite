// ============================================
// Btoolsify - Word Counter AAA v2
// ============================================

// ── Stopwords per lingua ──────────────────────
var STOPWORDS = {
    it: new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'è', 'in', 'di', 'a', 'da', 'con', 'su', 'per', 'tra', 'fra', 'che', 'non', 'si', 'mi', 'ti', 'ci', 'vi', 'se', 'ma', 'o', 'anche', 'come', 'più', 'già', 'ancora', 'molto', 'solo', 'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle', 'sono', 'ha', 'ho', 'hai', 'abbiamo', 'avete', 'hanno', 'era', 'erano', 'stato', 'stata', 'stati', 'state', 'essere', 'fare', 'del', 'della', 'dei', 'degli', 'delle', 'al', 'alla', 'ai', 'agli', 'alle', 'dal', 'dalla', 'dai', 'dagli', 'dalle', 'nel', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sulla', 'sui', 'sugli', 'sulle', 'qui', 'lì', 'dove', 'quando', 'come', 'perché', 'però', 'quindi', 'così', 'poi', 'allora', 'dopo', 'prima', 'sempre', 'mai', 'ogni', 'tutto', 'tutti', 'tutta', 'tutte', 'suo', 'sua', 'suoi', 'sue', 'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue', 'loro', 'nostro', 'nostra', 'vostro', 'vostra']),
    en: new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'not', 'no', 'so', 'if', 'then', 'than', 'as', 'into', 'about', 'after', 'before', 'up', 'out', 'there', 'when', 'where', 'how', 'why', 'all', 'any', 'each', 'every', 'some', 'such', 'own', 'same', 'too', 'very', 'just', 'because', 'while', 'although', 'since', 'until', 'unless', 'however', 'therefore', 'moreover', 'furthermore', 'also', 'either', 'neither', 'both', 'whether'])
};

var WEAK_WORDS = new Set(['molto', 'davvero', 'proprio', 'assolutamente', 'decisamente', 'certamente', 'sicuramente', 'veramente', 'effettivamente', 'basically', 'really', 'very', 'quite', 'rather', 'fairly', 'pretty', 'absolutely', 'definitely', 'certainly', 'actually', 'literally', 'honestly', 'frankly', 'clearly', 'obviously']);

var PASSIVE_IT = /\b(è stato|è stata|sono stati|sono state|era stato|era stata|erano stati|erano state|viene|vengono|veniva|venivano|fu|furono|sarà|saranno)\b/gi;
var PASSIVE_EN = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;

// ── State ─────────────────────────────────────
var highlightOn = false;
var focusMode = false;
var timerInterval = null;
var timerSeconds = 0;
var timerStarted = false;
var autosaveTimer = null;
var debounceTimer = null;
var wordGoal = 0;
var detectedLang = 'it';
var currentMode = 'standard';
var seoKeyword = '';
var pomodoroInterval = null;
var pomodoroSeconds = 25 * 60;
var pomodoroRunning = false;
var wordsAtStart = 0;
var wordsHistory = [];

// Intl.Segmenter support check
var hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined';

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    var editor = document.getElementById('editor');

    var saved = localStorage.getItem('wc-text');
    if (saved) { editor.value = saved; analyzeText(); }

    var savedGoal = localStorage.getItem('wc-goal');
    if (savedGoal) {
        wordGoal = parseInt(savedGoal) || 0;
        var goalInput = document.getElementById('goal-input');
        if (goalInput) goalInput.value = wordGoal || '';
    }

    var savedSeo = localStorage.getItem('wc-seo');
    if (savedSeo) {
        seoKeyword = savedSeo;
        var seoInput = document.getElementById('seo-input');
        if (seoInput) seoInput.value = seoKeyword;
    }

    editor.addEventListener('input', function () {
        if (!timerStarted && editor.value.trim().length > 0) {
            startTimer();
            timerStarted = true;
            wordsAtStart = countWords(editor.value);
        }

        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(function () {
            localStorage.setItem('wc-text', editor.value);
            showAutosaveBadge();
        }, 1500);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(analyzeText, 100);
    });

    // Goal input
    var goalInput = document.getElementById('goal-input');
    if (goalInput) {
        goalInput.addEventListener('input', function () {
            wordGoal = parseInt(this.value) || 0;
            localStorage.setItem('wc-goal', wordGoal);
            updateGoalBar(countWords(document.getElementById('editor').value));
        });
    }

    // SEO input
    var seoInput = document.getElementById('seo-input');
    if (seoInput) {
        seoInput.addEventListener('input', function () {
            seoKeyword = this.value.trim().toLowerCase();
            localStorage.setItem('wc-seo', seoKeyword);
            analyzeText();
        });
    }
});

// ── Rilevamento lingua ────────────────────────
function detectLanguage(text) {
    var itScore = (text.match(/\b(che|non|sono|della|degli|questo|però|anche|come|perché|così)\b/gi) || []).length;
    var enScore = (text.match(/\b(the|and|that|this|with|have|from|they|been|which)\b/gi) || []).length;
    return itScore >= enScore ? 'it' : 'en';
}

// ── Tokenizzazione robusta ────────────────────
function countWords(text) {
    if (!text.trim()) return 0;
    if (hasSegmenter) {
        try {
            var segmenter = new Intl.Segmenter(detectedLang, { granularity: 'word' });
            return Array.from(segmenter.segment(text)).filter(function (s) { return s.isWordLike; }).length;
        } catch (e) { }
    }
    // Fallback robusto — gestisce apostrofi e trattini
    return text.trim()
        .replace(/['']/g, "'")
        .split(/[\s\u200B\u00A0]+/)
        .filter(function (w) { return /[a-zA-ZàèéìòùÀÈÉÌÒÙ\u00C0-\u024F]/.test(w); })
        .length;
}

function getWordList(text) {
    if (!text.trim()) return [];
    if (hasSegmenter) {
        try {
            var segmenter = new Intl.Segmenter(detectedLang, { granularity: 'word' });
            return Array.from(segmenter.segment(text))
                .filter(function (s) { return s.isWordLike; })
                .map(function (s) { return s.segment.toLowerCase(); });
        } catch (e) { }
    }
    return text.toLowerCase().match(/[a-zA-ZàèéìòùÀÈÉÌÒÙ''\-]+/g) || [];
}

// ── Analisi principale ────────────────────────
function analyzeText() {
    var text = document.getElementById('editor').value;

    // Rileva lingua
    if (text.length > 50) detectedLang = detectLanguage(text);
    updateLangBadge();

    var wordList = getWordList(text);
    var words = wordList.length;
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var lines = text === '' ? 0 : text.split('\n').length;
    var paragraphs = countParagraphs(text);
    var sentences = countSentences(text);
    var sentenceList = getSentences(text);

    // Avanzate
    var wpf = sentences > 0 ? (words / sentences).toFixed(1) : '—';
    var awl = words > 0 ? (charsNoSpaces / words).toFixed(1) : '—';
    var readTime = readingTime(words);
    var longSentences = sentenceList.filter(function (s) { return countWords(s) > 25; }).length;
    var longSentencesPct = sentences > 0 ? Math.round(longSentences / sentences * 100) : 0;
    var gulpease = calcGulpease(text, words, sentences);
    var flesch = calcFlesch(text, words, sentences);
    var ttr = calcTTR(wordList);
    var passiveCount = countPassive(text);
    var weakCount = countWeakWords(wordList);
    var adverbCount = countAdverbs(wordList);
    var wpm = calcWPM(words);

    // UI update
    setVal('s-words', words);
    setVal('s-chars', chars);
    setVal('s-chars-ns', charsNoSpaces);
    setVal('s-lines', lines);
    setVal('s-paragraphs', paragraphs);
    setVal('s-sentences', sentences);
    setVal('s-wpf', wpf);
    setVal('s-awl', awl !== '—' ? awl + ' car.' : '—');
    setVal('s-read', readTime);
    setVal('s-long', longSentences > 0 ? longSentences + ' (' + longSentencesPct + '%) ⚠️' : '0');
    setVal('s-ttr', ttr !== null ? (ttr * 100).toFixed(1) + '%' : '—');
    setVal('s-passive', passiveCount > 0 ? passiveCount + ' ⚠️' : '0');
    setVal('s-weak', weakCount > 0 ? weakCount + ' ⚠️' : '0');
    setVal('s-adverbs', adverbCount > 0 ? adverbCount : '0');
    setVal('s-wpm', wpm > 0 ? wpm + ' p/m' : '—');

    // Bar
    setVal('bar-words', words);
    setVal('bar-chars', chars);
    setVal('bar-read', readTime);
    setVal('bar-sentences', sentences);

    // Leggibilità
    updateGulpease(gulpease);
    updateFlesch(flesch);

    // Goal
    updateGoalBar(words);

    // Keywords & ripetizioni
    updateKeywords(wordList);
    updateRepetitions(wordList, text);

    // SEO
    updateSEO(text, words);

    // Highlight
    if (highlightOn) updateHighlight(text, sentenceList, wordList);

    document.getElementById('aria-status').textContent = 'Parole: ' + words + ', Caratteri: ' + chars;
}

// ── Contatori ─────────────────────────────────
function countParagraphs(text) {
    if (!text.trim()) return 0;
    return text.split(/\n\s*\n/).filter(function (p) { return p.trim().length > 0; }).length;
}

function countSentences(text) {
    if (!text.trim()) return 0;
    return getSentences(text).length || 1;
}

function getSentences(text) {
    if (!text.trim()) return [];
    var raw = text.match(/[^.!?…]+[.!?…]+/g) || [];
    if (!raw.length && text.trim()) return [text.trim()];
    return raw;
}

function readingTime(words) {
    if (words === 0) return '—';
    var mins = words / 200;
    if (mins < 1) return Math.round(mins * 60) + 's';
    var m = Math.floor(mins); var s = Math.round((mins - m) * 60);
    return s > 0 ? m + 'm ' + s + 's' : m + 'm';
}

// ── TTR ───────────────────────────────────────
function calcTTR(wordList) {
    if (wordList.length < 5) return null;
    var unique = new Set(wordList).size;
    return unique / wordList.length;
}

// ── Passivo ───────────────────────────────────
function countPassive(text) {
    var re = detectedLang === 'it' ? PASSIVE_IT : PASSIVE_EN;
    re.lastIndex = 0;
    return (text.match(re) || []).length;
}

// ── Parole deboli ─────────────────────────────
function countWeakWords(wordList) {
    return wordList.filter(function (w) { return WEAK_WORDS.has(w); }).length;
}

// ── Avverbi ───────────────────────────────────
function countAdverbs(wordList) {
    return wordList.filter(function (w) {
        return (detectedLang === 'it' && w.endsWith('mente')) ||
            (detectedLang === 'en' && w.endsWith('ly') && w.length > 4);
    }).length;
}

// ── WPM ───────────────────────────────────────
function calcWPM(words) {
    if (timerSeconds < 10 || words === 0) return 0;
    return Math.round((words - wordsAtStart) / (timerSeconds / 60));
}

// ── Gulpease ──────────────────────────────────
function calcGulpease(text, words, sentences) {
    if (words < 3 || sentences === 0) return null;
    var letters = (text.match(/[a-zA-ZàèéìòùÀÈÉÌÒÙ]/g) || []).length;
    return Math.min(100, Math.max(0, Math.round(89 - (letters / words * 10) + (sentences / words * 300))));
}

function updateGulpease(score) {
    var el = document.getElementById('s-gulpease');
    var bar = document.getElementById('s-gulpease-bar');
    var label = document.getElementById('s-gulpease-label');
    if (!el) return;
    if (score === null) { el.textContent = '—'; bar.style.width = '0%'; label.textContent = 'Scrivi almeno 3 parole'; return; }
    el.textContent = score;
    bar.style.width = score + '%';
    var c, d;
    if (score >= 80) { c = '#059669'; d = 'Molto facile — elementare'; }
    else if (score >= 60) { c = '#0ea5e9'; d = 'Facile — media'; }
    else if (score >= 40) { c = '#f59e0b'; d = 'Normale — superiore'; }
    else if (score >= 20) { c = '#ef4444'; d = 'Difficile — università'; }
    else { c = '#7c3aed'; d = 'Molto difficile — specialistico'; }
    bar.style.background = c; el.style.color = c; label.textContent = d;
}

// ── Flesch-Kincaid ────────────────────────────
function calcFlesch(text, words, sentences) {
    if (words < 5 || sentences === 0) return null;
    var syllables = countSyllables(text, words);
    // Flesch Reading Ease
    var score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.min(100, Math.max(0, Math.round(score)));
}

function countSyllables(text, words) {
    // Approssimazione per sillabe — conta gruppi vocalici
    var matches = text.match(/[aeiouàèéìòùAEIOUÀÈÉÌÒÙ]+/g) || [];
    return Math.max(words, matches.length);
}

function updateFlesch(score) {
    var el = document.getElementById('s-flesch');
    var label = document.getElementById('s-flesch-label');
    if (!el) return;
    if (score === null) { el.textContent = '—'; if (label) label.textContent = ''; return; }
    el.textContent = score;
    var d;
    if (score >= 90) d = 'Molto facile';
    else if (score >= 70) d = 'Facile';
    else if (score >= 50) d = 'Normale';
    else if (score >= 30) d = 'Difficile';
    else d = 'Molto difficile';
    if (label) label.textContent = d;
}

// ── Goal parole ───────────────────────────────
function updateGoalBar(words) {
    var wrap = document.getElementById('goal-wrap');
    var bar = document.getElementById('goal-bar');
    var label = document.getElementById('goal-label');
    if (!wrap) return;
    if (!wordGoal) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    var pct = Math.min(100, Math.round(words / wordGoal * 100));
    bar.style.width = pct + '%';
    bar.style.background = pct >= 100 ? '#059669' : 'var(--brand-primary)';
    label.textContent = words + ' / ' + wordGoal + ' parole (' + pct + '%)';
}

// ── Keyword frequency ─────────────────────────
function updateKeywords(wordList) {
    var list = document.getElementById('keyword-list');
    if (!list) return;
    var stopwords = STOPWORDS[detectedLang] || STOPWORDS.it;
    if (!wordList.length) {
        list.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted);">Scrivi del testo...</span>';
        return;
    }
    var freq = {};
    wordList.forEach(function (w) {
        if (w.length > 2 && !stopwords.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
    var sorted = Object.entries(freq).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    if (!sorted.length) { list.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted);">Nessuna parola significativa</span>'; return; }
    var max = sorted[0][1];
    list.innerHTML = sorted.map(function (e) {
        var pct = Math.round(e[1] / max * 100);
        var isWeak = WEAK_WORDS.has(e[0]);
        return '<div class="keyword-item">' +
            '<span class="keyword-word" style="' + (isWeak ? 'color:#f59e0b' : '') + '">' + escapeHtml(e[0]) + (isWeak ? ' ⚠️' : '') + '</span>' +
            '<div class="keyword-bar-wrap"><div class="keyword-bar" style="width:' + pct + '%;' + (isWeak ? 'background:#f59e0b' : '') + '"></div></div>' +
            '<span class="keyword-count">' + e[1] + '</span></div>';
    }).join('');
}

// ── Ripetizioni ravvicinate ───────────────────
function updateRepetitions(wordList, text) {
    var el = document.getElementById('s-repetitions');
    if (!el) return;
    var stopwords = STOPWORDS[detectedLang] || STOPWORDS.it;
    var warnings = [];
    var window_size = 50;
    for (var i = 0; i < wordList.length; i++) {
        var w = wordList[i];
        if (w.length < 4 || stopwords.has(w)) continue;
        var windowEnd = Math.min(wordList.length, i + window_size);
        var count = 0;
        for (var j = i + 1; j < windowEnd; j++) {
            if (wordList[j] === w) count++;
        }
        if (count >= 2 && !warnings.includes(w)) warnings.push(w);
    }
    if (warnings.length === 0) {
        el.textContent = '✓ Nessuna';
        el.style.color = '#059669';
    } else {
        el.textContent = warnings.slice(0, 3).map(function (w) { return '"' + w + '"'; }).join(', ');
        el.style.color = '#f59e0b';
    }
}

// ── SEO ───────────────────────────────────────
function updateSEO(text, words) {
    var wrap = document.getElementById('seo-results');
    if (!wrap) return;
    if (!seoKeyword) { wrap.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted);">Inserisci una keyword target</span>'; return; }
    var re = new RegExp(escapeRegex(seoKeyword), 'gi');
    var count = (text.match(re) || []).length;
    var density = words > 0 ? ((count / words) * 100).toFixed(2) : 0;
    var status = density < 0.5 ? '🔴 Troppo bassa' : density > 3 ? '🟡 Troppo alta' : '🟢 Ottimale';
    wrap.innerHTML =
        '<div class="stat-row"><span class="stat-row-label">Occorrenze</span><span class="stat-row-val">' + count + '</span></div>' +
        '<div class="stat-row"><span class="stat-row-label">Densità</span><span class="stat-row-val">' + density + '%</span></div>' +
        '<div class="stat-row" style="border:none"><span class="stat-row-label">Valutazione</span><span class="stat-row-val">' + status + '</span></div>';
}

// ── Highlight ─────────────────────────────────
function toggleHighlight() {
    highlightOn = !highlightOn;
    document.getElementById('btn-highlight').classList.toggle('active', highlightOn);
    var editor = document.getElementById('editor');
    if (!highlightOn) {
        editor.style.borderLeft = '';
    } else {
        analyzeText();
    }
}

function updateHighlight(text, sentenceList, wordList) {
    var editor = document.getElementById('editor');
    var hasLong = sentenceList.some(function (s) { return countWords(s) > 25; });
    var hasWeak = wordList.some(function (w) { return WEAK_WORDS.has(w); });
    var hasPassive = countPassive(text) > 0;

    if (hasLong || hasPassive) editor.style.borderLeft = '4px solid #ef4444';
    else if (hasWeak) editor.style.borderLeft = '4px solid #f59e0b';
    else editor.style.borderLeft = '4px solid #059669';
}

// ── Lingua badge ──────────────────────────────
function updateLangBadge() {
    var el = document.getElementById('lang-badge');
    if (el) el.textContent = detectedLang === 'it' ? '🇮🇹 Italiano' : '🇬🇧 English';
}

// ── Timer scrittura ───────────────────────────
function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(function () {
        timerSeconds++;
        updateTimerDisplay();
        // WPM ogni 10 secondi
        if (timerSeconds % 10 === 0) {
            var w = countWords(document.getElementById('editor').value);
            setVal('s-wpm', calcWPM(w) + ' p/m');
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null; timerSeconds = 0; timerStarted = false; wordsAtStart = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    var m = Math.floor(timerSeconds / 60), s = timerSeconds % 60;
    var str = pad(m) + ':' + pad(s);
    setVal('s-timer', str); setVal('bar-timer', str);
}

// ── Pomodoro ──────────────────────────────────
function togglePomodoro() {
    if (pomodoroRunning) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        document.getElementById('btn-pomodoro').innerHTML = '<i class="fas fa-play"></i> Avvia';
    } else {
        pomodoroRunning = true;
        document.getElementById('btn-pomodoro').innerHTML = '<i class="fas fa-pause"></i> Pausa';
        pomodoroInterval = setInterval(function () {
            pomodoroSeconds--;
            updatePomodoroDisplay();
            if (pomodoroSeconds <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroRunning = false;
                pomodoroSeconds = 25 * 60;
                updatePomodoroDisplay();
                document.getElementById('btn-pomodoro').innerHTML = '<i class="fas fa-play"></i> Avvia';
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('Btoolsify', { body: '🍅 Pomodoro completato! Prenditi una pausa.' });
                } else {
                    alert('🍅 Pomodoro completato! Prenditi una pausa.');
                }
            }
        }, 1000);
    }
}

function resetPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    pomodoroSeconds = 25 * 60;
    updatePomodoroDisplay();
    document.getElementById('btn-pomodoro').innerHTML = '<i class="fas fa-play"></i> Avvia';
}

function updatePomodoroDisplay() {
    var m = Math.floor(pomodoroSeconds / 60), s = pomodoroSeconds % 60;
    setVal('s-pomodoro', pad(m) + ':' + pad(s));
    var pct = Math.round((1 - pomodoroSeconds / (25 * 60)) * 100);
    var bar = document.getElementById('pomodoro-bar');
    if (bar) bar.style.width = pct + '%';
}

// ── Focus mode ────────────────────────────────
function toggleFocus() {
    focusMode = !focusMode;
    document.body.classList.toggle('focus-mode', focusMode);
    var btn = document.getElementById('btn-focus');
    btn.classList.toggle('active', focusMode);
    btn.innerHTML = focusMode ? '<i class="fas fa-compress"></i> Esci' : '<i class="fas fa-expand"></i> Focus';
}

// ── Clear ─────────────────────────────────────
function clearEditor() {
    if (!document.getElementById('editor').value) return;
    if (!confirm('Cancellare tutto il testo?')) return;
    document.getElementById('editor').value = '';
    localStorage.removeItem('wc-text');
    resetTimer(); timerStarted = false;
    analyzeText();
}

// ── Autosave ──────────────────────────────────
function showAutosaveBadge() {
    var badge = document.getElementById('autosave-badge');
    badge.classList.add('visible');
    setTimeout(function () { badge.classList.remove('visible'); }, 2000);
}

// ── Export ────────────────────────────────────
function exportTxt() {
    var text = document.getElementById('editor').value;
    if (!text.trim()) { alert('Nessun testo!'); return; }
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'testo-btoolsify.txt'; a.click();
    URL.revokeObjectURL(url);
}

function exportPdf() {
    var text = document.getElementById('editor').value;
    if (!text.trim()) { alert('Nessun testo!'); return; }
    var win = window.open('', '_blank');
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Btoolsify Export</title>' +
        '<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;font-size:14px;line-height:1.8;color:#111;padding:0 20px;}' +
        'h1{font-size:18px;color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px;}p{margin:0 0 16px;}</style></head><body>' +
        '<h1>Testo esportato da Btoolsify</h1>' +
        '<div>' + text.split('\n').map(function (l) { return l.trim() ? '<p>' + escapeHtml(l) + '</p>' : '<br>'; }).join('') + '</div>' +
        '<script>window.print();window.onafterprint=function(){window.close();}<\/script></body></html>');
    win.document.close();
}

// ── Helpers ───────────────────────────────────
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}