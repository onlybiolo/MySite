document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const sideBar = document.getElementById('side-bar');
    const body = document.body;

    if (menuToggle && sideBar) {
        menuToggle.addEventListener('click', () => {
            sideBar.classList.toggle('active');
            menuToggle.classList.toggle('active');
            body.classList.toggle('menu-open'); // To handle overflow hidden if needed
        });

        // Close menu when clicking a link (optional, good for UX)
        sideBar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sideBar.classList.remove('active');
                menuToggle.classList.remove('active');
                body.classList.remove('menu-open');
            });
        });

        // Close when clicking outside (on main content) if menu is open
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

    /* --- MOBILE SEARCH TOGGLE --- */
    const mobileSearchBtn = document.getElementById('mobile-search-toggle');
    const searchContainer = document.querySelector('.search-container');

    if (mobileSearchBtn && searchContainer) {
        mobileSearchBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent closing immediately
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                document.getElementById('search-bar').focus();
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                searchContainer.classList.contains('active') &&
                !searchContainer.contains(e.target) &&
                !mobileSearchBtn.contains(e.target)) {

                searchContainer.classList.remove('active');
            }
        });
    }

    /* --- SEARCH LOGIC --- */
    const searchBar = document.getElementById('search-bar');
    const searchBtn = document.getElementById('search-btn');

    function performSearch() {
        const query = searchBar.value.toLowerCase().trim();
        if (!query) return;

        // Ensure searchIndex exists (from SearchData.js)
        if (typeof searchIndex !== 'undefined') {
            const result = searchIndex.find(item =>
                item.name.toLowerCase().includes(query) ||
                item.tags.some(tag => tag.toLowerCase().includes(query))
            );

            if (result) {
                // In a real app, this would be: window.location.href = result.url;
                alert(`Trovato! Ti porto a: ${result.name}\nURL: ${result.url}`);
                // window.location.href = result.url; // Uncomment when real URLs exist
            } else {
                alert("Nessun risultato trovato. Prova con 'pdf', 'qr' o 'calcolatrice'.");
            }
        } else {
            console.error("Search Index not loaded!");
        }
    }

    if (searchBar && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
});
