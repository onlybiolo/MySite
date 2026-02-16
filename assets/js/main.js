document.addEventListener('DOMContentLoaded', () => {
    /* --- CONFIG & STATE --- */
    const isSubfolder = window.location.pathname.includes('/tools/');
    const menuToggle = document.getElementById('menu-toggle');
    const sideBar = document.getElementById('side-bar');
    // Global Analytics / Usage Tracking
    window.trackUsage = function (toolId, toolName) {
        // Evita di tracciare durante lo sviluppo locale se necessario
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`[Dev] Tracking: ${toolName} (${toolId})`);
        }

        fetch('/.netlify/functions/track-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolId, toolName })
        }).catch(err => console.error("Tracking error:", err));
    };
    const body = document.body;

    /* --- THEME LOGIC (Centralized) --- */
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    function applyTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    // Initialize theme icon on load
    applyTheme(localStorage.getItem('theme') || 'light');

    /* --- SIDEBAR ACTIVE STATE (Automatic) --- */
    if (sideBar) {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = sideBar.querySelectorAll('a');
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href').split('/').pop();
            if (linkPath === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /* --- MENU TOGGLE (Mobile) --- */
    if (menuToggle && sideBar) {
        menuToggle.addEventListener('click', () => {
            sideBar.classList.toggle('active');
            menuToggle.classList.toggle('active');
            body.classList.toggle('menu-open');
        });

        document.addEventListener('click', (e) => {
            if (sideBar.classList.contains('active') &&
                !sideBar.contains(e.target) &&
                !menuToggle.contains(e.target)) {
                sideBar.classList.remove('active');
                menuToggle.classList.remove('active');
                body.classList.remove('menu-open');
            }
        });
    }

    /* --- SEARCH LOGIC --- */
    const searchBar = document.getElementById('search-bar');
    const searchBtn = document.getElementById('search-btn');
    const searchDropdown = document.getElementById('search-dropdown');
    const mobileSearchBtn = document.getElementById('mobile-search-toggle');
    const searchContainer = document.querySelector('.search-container');

    function performSearch() {
        const query = searchBar.value.toLowerCase().trim();
        if (!query || typeof searchIndex === 'undefined') return;

        const result = searchIndex.find(item =>
            item.name.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
        );

        if (result) {
            let url = result.url;
            if (isSubfolder && !url.startsWith('#') && !url.startsWith('../')) {
                url = '../' + url;
            } else if (!isSubfolder && url.startsWith('index.html')) {
                // Keep as is
            }
            window.location.href = url;
        } else {
            showNoResults();
        }
    }

    function showNoResults() {
        if (searchDropdown) {
            searchDropdown.innerHTML = '<div class="search-no-result">Nessun risultato trovato</div>';
            searchDropdown.classList.add('active');
            setTimeout(() => searchDropdown.classList.remove('active'), 2000);
        }
    }

    function updateDropdown(query) {
        if (!query || typeof searchIndex === 'undefined') {
            searchDropdown.classList.remove('active');
            return;
        }

        const results = searchIndex.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
        ).slice(0, 5);

        if (results.length > 0) {
            searchDropdown.innerHTML = results.map(item => {
                let url = item.url;
                if (isSubfolder && !url.startsWith('#') && !url.startsWith('../')) {
                    url = '../' + url;
                }
                return `
                    <a href="${url}" class="search-item">
                        <span><i class="fas fa-${item.type === 'tool' ? 'tools' : 'file-alt'}"></i> ${item.name}</span>
                        <i class="fas fa-chevron-right" style="font-size: 0.8em; color: var(--text-muted);"></i>
                    </a>
                `;
            }).join('');
            searchDropdown.classList.add('active');
        } else {
            searchDropdown.classList.remove('active');
        }
    }

    if (searchBar && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchBar.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        searchBar.addEventListener('input', (e) => updateDropdown(e.target.value.toLowerCase().trim()));
        document.addEventListener('click', (e) => {
            if (!searchBar.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
            }
        });
    }

    if (mobileSearchBtn && searchContainer) {
        mobileSearchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) searchBar.focus();
        });
    }

    /* --- READING MODE LOGIC --- */
    const readingModeToggle = document.getElementById('reading-mode-toggle');

    function applyReadingMode(enabled) {
        if (enabled) {
            body.classList.add('reading-mode');
        } else {
            body.classList.remove('reading-mode');
        }
        localStorage.setItem('readingMode', enabled);

        if (readingModeToggle) {
            const icon = readingModeToggle.querySelector('i');
            if (icon) {
                icon.className = enabled ? 'fas fa-compress-arrows-alt' : 'fas fa-expand-alt';
            }
            readingModeToggle.title = enabled ? 'Esci dalla modalità lettura' : 'Modalità lettura (Fullscreen)';
        }
    }

    if (readingModeToggle) {
        readingModeToggle.addEventListener('click', () => {
            const isEnabled = body.classList.contains('reading-mode');
            applyReadingMode(!isEnabled);
        });

        // Initialize from storage or default off for new page loads usually, 
        // but here we follow dark mode pattern
        const savedReadingMode = localStorage.getItem('readingMode') === 'true';
        if (savedReadingMode) {
            applyReadingMode(true);
        }
    }
});


/* --- GLOBAL MODAL LOGIC (Accessible from anywhere) --- */
function showComingSoon(event) {
    if (event) event.preventDefault();

    // Remove existing if any
    const existing = document.querySelector('.coming-soon-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'coming-soon-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon"><i class="fas fa-magic"></i></div>
            <h3>Coming Soon!</h3>
            <p>Stiamo perfezionando questo strumento.<br>Sarà disponibile a breve con funzioni spaziali.</p>
            <button class="modal-close-btn">Ricevuto!</button>
        </div>
    `;

    modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.body.appendChild(modal);
    return false;
}
