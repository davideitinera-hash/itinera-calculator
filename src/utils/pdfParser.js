/**
 * pdfParser.js — Best-effort PDF parser for Itinera Calculator
 * 
 * Extracts project metadata, equipment/materials, and transport totals
 * from PDF quotes and order confirmations (Rentman / ERP format).
 * 
 * Uses a "Sliding Window" algorithm on a flat word array to detect
 * table columns: [Description] | [Qty] | [€ Unit Price] | [€ Total Price]
 */
import * as pdfjsLib from 'pdfjs-dist';

// Fix per Vite in Produzione: usa il CDN di unpkg per il worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── Helpers ──

/** Parse Italian-format number: "1.234,56" → 1234.56, "470,00" → 470 */
function parseItalianNumber(str) {
    if (!str) return 0;
    const cleaned = str.replace(/\s/g, '').replace(/€/g, '').trim();
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
}

/** Check if a word looks like a € price */
function isEuroPrice(word) {
    if (!word) return false;
    return /^€/.test(word.trim()) || /€\s*[\d]/.test(word.trim());
}

/** Extract the numeric value from a € price string */
function extractPrice(word) {
    if (!word) return 0;
    return parseItalianNumber(word.replace(/€/g, '').trim());
}

/**
 * Single-pass PDF extraction: reads the file ONCE and returns both
 * a flat word array (for sliding window) and Y-grouped lines (for metadata).
 */
async function extractPdfData(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const words = [];
    const allLines = [];

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();

        // Flat words — every text chunk becomes one entry
        for (const item of content.items) {
            const t = (item.str || '').trim();
            if (t) words.push(t);
        }

        // Grouped lines — same text items grouped by Y coordinate
        const lineMap = new Map();
        for (const item of content.items) {
            if (!item.str || !item.str.trim()) continue;
            const y = Math.round(item.transform[5]);
            const x = Math.round(item.transform[4]);
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y).push({ text: item.str, x });
        }

        const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
        for (const y of sortedYs) {
            const items = lineMap.get(y).sort((a, b) => a.x - b.x);
            const lineText = items.map(i => i.text).join(' ').trim();
            if (lineText) allLines.push(lineText);
        }
    }

    return { words, lines: allLines };
}

// ── Parsing Heuristics ──

/** Extract client name */
function parseClient(lines) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m = line.match(/Cliente\s*:\s*(.+)/i) || line.match(/Client\s*:\s*(.+)/i);
        if (m) return m[1].trim();
        const m2 = line.match(/Destinatario\s*:\s*(.+)/i);
        if (m2) return m2[1].trim();
        const m3 = line.match(/Intestato\s+a\s*:\s*(.+)/i);
        if (m3) return m3[1].trim();
    }
    return '';
}

/** Extract project name and code */
function parseProject(lines) {
    let projectName = '';
    let projectCode = '';

    for (const line of lines) {
        const codeMatch = line.match(/\[(\d{3,6})\]\s*(.+)/);
        if (codeMatch) {
            projectCode = codeMatch[1];
            projectName = codeMatch[2].trim();
            return { projectName, projectCode };
        }
        const projMatch = line.match(/Progetto\s*(?:N[°o]?)?\s*:\s*(.+)/i);
        if (projMatch) projectName = projMatch[1].trim();
        const evMatch = line.match(/Evento\s*:\s*(.+)/i);
        if (evMatch && !projectName) projectName = evMatch[1].trim();
        const confMatch = line.match(/(?:Conferma d'ordine|Preventivo|Offerta)\s*(?:N[°o.]?)?\s*(\d+)/i);
        if (confMatch && !projectCode) projectCode = confMatch[1];
    }

    return { projectName, projectCode };
}

/** Extract event date */
function parseDate(lines) {
    for (const line of lines) {
        const m = line.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
        if (m) {
            const [, d, mo, y] = m;
            return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return '';
}

/**
 * SLIDING WINDOW material parser.
 * Pattern: [Qty (integer)] → [€ Unit Price] → [€ Total Price]
 * Description is collected backward, stopping at ALL CAPS titles.
 */
function parseMaterialsFromWords(words) {
    const materials = [];

    for (let i = 0; i < words.length - 2; i++) {
        const w0 = words[i];
        const w1 = words[i + 1];
        const w2 = words[i + 2];

        const isQty = /^\d+$/.test(w0) && parseInt(w0) > 0 && parseInt(w0) < 10000;
        const isPrice1 = isEuroPrice(w1);
        const isPrice2 = isEuroPrice(w2);

        if (isQty && isPrice1 && isPrice2) {
            const qty = parseInt(w0);
            const unitPrice = extractPrice(w1);

            if (unitPrice <= 0 || unitPrice > 1000000) continue;

            // Walk backward to collect multi-line description parts
            // Stop at ALL CAPS words (Rentman group titles like "ROLL UP 85X200")
            const descParts = [];
            for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
                const word = words[j].trim();
                if (!word) continue;
                if (word.includes('€') || word.toLowerCase().includes('totale')) break;
                const isAllCaps = /^[^a-z]+$/.test(word) && /[A-Z]/.test(word);
                if (isAllCaps) break;
                descParts.unshift(word);
            }
            const desc = descParts.join(' ').trim();

            if (desc.length >= 2) {
                materials.push({ desc, qty, sellPrice: unitPrice });
                i += 2; // Advance past the two € prices
            }
        }
    }

    return materials;
}

/** Extract transport total */
function parseTransport(lines) {
    for (const line of lines) {
        const m = line.match(/(?:totale\s+)?trasport[oi]\s*:?\s*€?\s*([\d.,]+)/i);
        if (m) return parseItalianNumber(m[1]);
        const m2 = line.match(/logistica\s*:?\s*€?\s*([\d.,]+)/i);
        if (m2) return parseItalianNumber(m2[1]);
    }
    return 0;
}

/** Extract gross revenue / total quote amount */
function parseRevenue(lines) {
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const m = line.match(/(?:totale\s+(?:preventivo|offerta|generale|imponibile)?)\s*:?\s*€?\s*([\d.,]+)/i);
        if (m) {
            const val = parseItalianNumber(m[1]);
            if (val > 100) return val;
        }
    }
    return 0;
}

// ── Main Export ──

/**
 * Parse a PDF file and extract project data.
 * Best-effort: never throws, always returns partial results.
 */
export async function parsePdfFile(file) {
    const result = {
        project: { clientName: '', projectName: '', projectCode: '', eventDate: '' },
        materials: [],
        transportTotal: 0,
        revenueGross: 0,
        rawLineCount: 0,
        errors: [],
    };

    try {
        // Single-pass extraction — reads the PDF only once
        const { words, lines } = await extractPdfData(file);

        console.log('[PDF Parser] Raw words array:', words);
        console.log('[PDF Parser] Total words:', words.length, '| Total lines:', lines.length);

        result.rawLineCount = lines.length;

        if (words.length === 0 && lines.length === 0) {
            result.errors.push('Nessun testo trovato nel PDF (potrebbe essere un PDF scansionato/immagine).');
            return result;
        }

        try { result.project.clientName = parseClient(lines); }
        catch (e) { result.errors.push(`Cliente: ${e.message}`); }

        try {
            const { projectName, projectCode } = parseProject(lines);
            result.project.projectName = projectName;
            result.project.projectCode = projectCode;
        } catch (e) { result.errors.push(`Progetto: ${e.message}`); }

        try { result.project.eventDate = parseDate(lines); }
        catch (e) { result.errors.push(`Data: ${e.message}`); }

        try { result.materials = parseMaterialsFromWords(words); }
        catch (e) { result.errors.push(`Materiali: ${e.message}`); }

        try { result.transportTotal = parseTransport(lines); }
        catch (e) { result.errors.push(`Trasporto: ${e.message}`); }

        try { result.revenueGross = parseRevenue(lines); }
        catch (e) { result.errors.push(`Ricavo: ${e.message}`); }

    } catch (e) {
        result.errors.push(`Errore lettura PDF: ${e.message}`);
    }

    console.log('[PDF Parser] Result:', JSON.stringify(result, null, 2));
    return result;
}
