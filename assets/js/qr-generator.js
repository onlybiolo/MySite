document.addEventListener('DOMContentLoaded', () => {
    // Inizializzazione QR Code
    const qrcodeElement = document.getElementById("qrcode");
    if (!qrcodeElement) return;

    const qrcode = new QRCode(qrcodeElement, {
        text: "https://btoolsify.com",
        width: 256,
        height: 256,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Gestione Tabs
    window.switchMode = function (mode) {
        const textMode = document.getElementById('textMode');
        const fileMode = document.getElementById('fileMode');
        const tabText = document.getElementById('tabText');
        const tabFile = document.getElementById('tabFile');

        if (mode === 'text') {
            textMode.classList.remove('hidden');
            fileMode.classList.add('hidden');
            tabText.classList.add('active');
            tabFile.classList.remove('active');
        } else {
            textMode.classList.add('hidden');
            fileMode.classList.remove('hidden');
            tabFile.classList.add('active');
            tabText.classList.remove('active');
        }
    };

    // Generazione da Testo/Link
    const dataInput = document.getElementById('dataInput');
    if (dataInput) {
        dataInput.addEventListener('input', function (e) {
            const value = e.target.value.trim();
            if (value) {
                qrcode.makeCode(value);
            } else {
                qrcode.makeCode(" ");
            }
        });
    }

    // Generazione da Immagine (Image to QR)
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                const base64String = event.target.result;
                try {
                    qrcode.makeCode(base64String);
                } catch (err) {
                    alert("Immagine troppo pesante. Prova con un'icona più piccola.");
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Funzione Download
    window.downloadQR = function () {
        const canvas = document.querySelector('#qrcode canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = 'btoolsify-qr-code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Tracking
        if (typeof trackUsage === 'function') {
            trackUsage('qr-generator', 'QR Generator');
        }
    };
});
