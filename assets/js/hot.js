/**
 * Btoolsify HOT Logic
 * Handles dynamic rendering of the HOT section.
 */

document.addEventListener('DOMContentLoaded', () => {
    initHotSection();
});

function initHotSection() {
    renderTrending();
    renderDailyTip();
    renderLabs();
    fetchTechNews();
}

// 4. Tech News (Fetch from external source via RSS2JSON)
async function fetchTechNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    try {
        // TechCrunch RSS feed converted to JSON via rss2json.com (Free tier)
        const RSS_FEED = "https://techcrunch.com/feed/";
        const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED)}`;

        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.status === 'ok' && data.items) {
            container.innerHTML = data.items.slice(0, 3).map(item => {
                // Estrai una data "tempo fa" (semplificato)
                const pubDate = new Date(item.pubDate);
                const diffHours = Math.floor((new Date() - pubDate) / (1000 * 60 * 60));
                const timeStr = diffHours < 1 ? "Recentissima" : `${diffHours} ore fa`;

                return `
                    <div class="card" style="padding: 20px;">
                        <span style="font-size: 0.7rem; color: var(--hot-accent); font-weight: 800;">TECHCRUNCH • ${timeStr.toUpperCase()}</span>
                        <h4 style="margin: 10px 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.title}</h4>
                        <p style="font-size: 0.85rem; opacity: 0.8;">${item.description.replace(/<[^>]*>?/gm, '').substring(0, 100)}...</p>
                        <a href="${item.link}" target="_blank" style="font-size: 0.75rem; color: var(--hot-accent); text-decoration: none; font-weight: 600;">Leggi di più <i class="fas fa-external-link-alt"></i></a>
                    </div>
                `;
            }).join('');
        } else {
            throw new Error("Invalid RSS response");
        }
    } catch (err) {
        console.warn("RSS Feed backup loaded:", err);
        const fallbackNews = [
            { title: "Google aggiorna SGE", tags: "NEWS • 1H FA", text: "Nuovi algoritmi per la ricerca generativa. La SEO cambierà ancora." },
            { title: "Guiding the Future of AI", tags: "TECH • 3H FA", text: "OpenAI lancia nuove linee guida per lo sviluppo sicuro delle intelligenze artificiali." },
            { title: "Wasm: performance record", tags: "TECH • 5H FA", text: "WebAssembly raggiunge nuove vette di velocità nei browser moderni." }
        ];

        container.innerHTML = fallbackNews.map(news => `
            <div class="card" style="padding: 20px;">
                <span style="font-size: 0.7rem; color: var(--hot-accent); font-weight: 800;">${news.tags}</span>
                <h4 style="margin: 10px 0;">${news.title}</h4>
                <p style="font-size: 0.85rem;">${news.text}</p>
            </div>
        `).join('');
    }
}

// 1. Render Trending Grid
async function renderTrending() {
    const container = document.getElementById('trending-container');
    if (!container) return;

    try {
        // Tenta di caricare i dati reali dal DB via Netlify Function
        const response = await fetch('/.netlify/functions/get-hot-data');
        const data = await response.json();
        const trendingList = data.trending && data.trending.length > 0 ? data.trending : hotData.trending;

        container.innerHTML = trendingList.map((item, index) => `
            <div class="trending-card">
                <span class="trending-number">0${index + 1}</span>
                <h3><i class="${item.icon}"></i> ${item.title}</h3>
                <p>${item.description}</p>
                <div class="trending-stats">
                    <span><i class="${item.statIcon}"></i> ${item.statText}</span>
                    <a href="${item.url}" class="hero-btn-small">Usa Ora</a>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.warn("Utilizzo dati di fallback (Database non configurato):", err);
        // Fallback ai dati statici se il DB non risponde
        container.innerHTML = hotData.trending.map((item, index) => `
            <div class="trending-card">
                <span class="trending-number">0${index + 1}</span>
                <h3><i class="${item.icon}"></i> ${item.title}</h3>
                <p>${item.description}</p>
                <div class="trending-stats">
                    <span><i class="${item.statIcon}"></i> ${item.statText}</span>
                    <a href="${item.url}" class="hero-btn-small">Usa Ora</a>
                </div>
            </div>
        `).join('');
    }
}

// 2. Render Daily Tip (Rotated by day of the year)
function renderDailyTip() {
    const tipText = document.getElementById('daily-tip-text');
    if (!tipText || !hotData.tips) return;

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Pick tip based on index (modulo to loop if tips < 365)
    const tipIndex = dayOfYear % hotData.tips.length;
    tipText.textContent = `"${hotData.tips[tipIndex]}"`;
}

// 3. Render Labs Section
function renderLabs() {
    const container = document.getElementById('labs-container');
    if (!container || !hotData.labs) return;

    container.innerHTML = hotData.labs.map(lab => `
        <div class="lab-item">
            <div class="lab-icon"><i class="${lab.icon}"></i></div>
            <div class="lab-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <h4 style="margin:0;">${lab.title}</h4>
                    <span class="labs-badge" style="font-size:0.6rem;">${lab.status}</span>
                </div>
                <p>${lab.description}</p>
                <a href="#" class="cta-text" style="color: var(--hot-accent); font-size: 0.8rem;" onclick="showComingSoon(event)">
                    ${lab.actionText} <i class="${lab.actionIcon}"></i>
                </a>
            </div>
        </div>
    `).join('');
}
