-- Esegui questo script nel SQL Editor di Neon (neon.tech)
-- per creare la tabella necessaria ai trend reali.

CREATE TABLE IF NOT EXISTS tool_usage (
    id SERIAL PRIMARY KEY,
    tool_id VARCHAR(100) UNIQUE NOT NULL, -- es. 'jpg-to-pdf'
    tool_name VARCHAR(100) NOT NULL,      -- es. 'JPG to PDF'
    usage_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inizializza con i tool esistenti (opzionale)
INSERT INTO tool_usage (tool_id, tool_name, usage_count) VALUES 
('jpg-to-pdf', 'JPG to PDF', 0),
('qr-generator', 'QR Generator', 0),
('image-resizer', 'Image Resizer', 0),
('word-counter', 'Word Counter', 0)
ON CONFLICT (tool_id) DO NOTHING;
