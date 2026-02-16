# Btoolsify - Strumenti Smart Online

Btoolsify è una piattaforma web moderna che offre strumenti gratuiti, veloci e sicuri per semplificare la vita digitale. Tutti gli strumenti sono eseguiti lato client (nel browser), garantendo la massima privacy per l'utente.

🌐 **Live:** [btoolsify.netlify.app](https://btoolsify.netlify.app)

## 🚀 Strumenti Disponibili

### 📄 PDF Tools
- **JPG to PDF** — Converti immagini (JPG, PNG, WEBP) in documenti PDF. Drag-and-drop, riordinamento e impostazioni pagina.
- **Merge PDF** — Unisci più file PDF in un unico documento.
- **Split PDF** — Dividi un PDF grande in file più piccoli. Estrai pagine specifiche.

### 🖼️ Image Tools
- **Image Resizer** — Ridimensiona immagini mantenendo la qualità. Supporta JPG, PNG, WebP.
- **Image Compressor** — Comprimi immagini riducendo il peso senza perdere qualità visiva.

### 🎨 Design & Utility
- **AI Palette Picker** — Genera palette di colori professionali basate su emozioni o ispirazioni.
- **Color Contrast Checker** — Verifica il contrasto testo/sfondo secondo gli standard WCAG 2.1.
- **QR Code Generator** — Crea codici QR personalizzati per URL, testo e altro.

### ✍️ Text Tools
- **Word Counter** — Conta parole, caratteri e righe. Perfetto per scrittori e studenti.

## 📰 Blog & Guide
- Sezione dedicata a guide pratiche su tecnologia, marketing digitale e produttività.
- Articolo live: *10 Modi Creativi per usare i QR Code nel tuo Ristorante*

## 🛠️ Caratteristiche Tecniche
- **Dark Mode** — Supporto completo per il tema scuro con anti-FOUC e salvataggio preferenze.
- **Fuzzy Search** — Sistema di ricerca intelligente integrato per trovare rapidamente i tool.
- **Mobile First** — Interfaccia ottimizzata per smartphone, tablet e desktop con bottom navbar mobile.
- **PWA Ready** — Manifest e icone configurati per l'installazione su dispositivi mobili.
- **SEO Optimized** — Meta tag completi, Open Graph, Twitter Cards, sitemap XML e robots.txt.
- **Accessibilità** — Skip links, focus indicators, aria labels, touch targets WCAG compliant.
- **Security Headers** — HSTS, X-Frame-Options, X-XSS-Protection via Netlify.
- **AdSense Integration** — ads.txt e script Google AdSense configurati.

## 📁 Struttura del Progetto

```text
MySite/
├── assets/
│   ├── css/main.css          # Design system con variabili CSS (light/dark)
│   ├── js/                   # Logica applicativa
│   │   ├── main.js           # Theme, search, sidebar, modals
│   │   ├── jpg-to-pdf.js     # Logic for JPG to PDF converter
│   │   ├── merge-pdf.js      # Logic for PDF merger
│   │   ├── split-pdf.js      # Logic for PDF splitter
│   │   ├── image-resizer.js  # Logic for image resizer
│   │   ├── image-compressor.js # Logic for image compressor
│   │   ├── palette-picker.js # Logic for AI palette picker
│   │   ├── contrast-checker.js # Logic for contrast checker
│   │   ├── qr-generator.js   # Logic for QR code generator
│   │   └── word-counter.js   # Logic for word counter
│   ├── json/palettedata.json # Palette data
│   └── wasm/                 # WebAssembly modules (image compression)
├── tools/                    # Individual tool pages
│   ├── jpg-to-pdf.html
│   ├── merge-pdf.html
│   ├── split-pdf.html
│   ├── image-resizer.html
│   ├── image-compressor.html
│   ├── palette-picker.html
│   ├── contrast-checker.html
│   ├── qr-generator.html
│   └── word-counter.html
├── blogs/                    # Blog articles
│   └── top10qr.html
├── data/search-index.js      # Search index for all tools
├── index.html                # Homepage
├── tools.html                # Tools catalog with filter chips
├── blog.html                 # Blog index (magazine layout)
├── favicon.svg               # SVG favicon (scalable)
├── favicon.png               # PNG favicon (192x192)
├── apple-touch-icon.png      # Apple touch icon (180x180)
├── manifest.json             # PWA manifest
├── sitemap.xml               # XML sitemap for search engines
├── robots.txt                # Robots directives
├── ads.txt                   # AdSense authorization
├── netlify.toml              # Netlify config with security headers
├── _redirects                # Netlify URL rewrites
└── README.md
```

## 🌐 Deployment

Il sito è configurato per il deployment su **Netlify** come sito statico (nessun build step necessario).

---
© 2026 Btoolsify. Tutti i diritti riservati.
