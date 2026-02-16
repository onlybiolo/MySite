/**
 * Btoolsify HOT Data
 * Centralized data for the HOT section.
 */

const hotData = {
    // Trending items (Manual "Source of Truth")
    trending: [
        {
            id: 1,
            title: "JPG to PDF",
            icon: "fas fa-file-pdf",
            description: "Il re della settimana. Oltre 1.250 conversioni completate solo oggi.",
            statText: "+24% questo mese",
            statIcon: "fas fa-chart-line",
            url: "tools/jpg-to-pdf.html",
            type: "tool"
        },
        {
            id: 2,
            title: "QR Generator",
            icon: "fas fa-qrcode",
            description: "Boom di QR code artistici per menu digitali e locali.",
            statText: "850 utenti attivi",
            statIcon: "fas fa-users",
            url: "tools/qr-generator.html",
            type: "tool"
        },
        {
            id: 3,
            title: "Blog: SEO 2026",
            icon: "fas fa-newspaper",
            description: "L'articolo più letto della giornata. Scopri il futuro degli algoritmi.",
            statText: "3k+ letture",
            statIcon: "fas fa-eye",
            url: "blogs/seo-2026.html",
            type: "blog"
        }
    ],

    // Daily productivity tips (Picked by date)
    tips: [
        "Usa la funzione Split PDF per inviare solo le pagine rilevanti dei tuoi documenti. Risparmi spazio e tempo.",
        "Il Word Counter non conta solo le parole: controlla anche il 'Reading Time' per ottimizzare la SEO dei tuoi articoli.",
        "Ti serve un colore perfetto? Carica uno screenshot del tuo sito nel Palette Picker per estrarre il brand kit istantaneamente.",
        "Compressione Immagini: Riduci il peso delle tue foto dell'80% senza perdere qualità visibile per far volare il tuo sito mobile.",
        "QR Code Dinamici: Usa il nostro generatore per creare codici che non scadono mai e che puoi stampare ovunque.",
        "Productivity Tip: Dedica i primi 90 minuti della tua giornata al 'Deep Work' senza notifiche.",
        "SEO Tip: La velocità di caricamento è il fattore #1 del 2026. Comprimi sempre le tue immagini prima di pubblicare."
    ],

    // Experimental lab features
    labs: [
        {
            title: "AI Image Upscaler (Beta)",
            icon: "fas fa-magic",
            description: "Aumenta la risoluzione delle tue foto senza perdere qualità grazie all'intelligenza artificiale.",
            status: "Experimental",
            actionText: "RESERVE ACCESS",
            actionIcon: "fas fa-lock"
        },
        {
            title: "HTML Clean & Formatter",
            icon: "fas fa-file-code",
            description: "Pulisci codice sporco da siti esterni in un unico click. Ideale per copywriter e dev.",
            status: "Beta Testing",
            actionText: "TEST LAB",
            actionIcon: "fas fa-flask"
        }
    ]
};
