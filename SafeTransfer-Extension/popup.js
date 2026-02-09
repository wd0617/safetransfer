// SafeTransfer Extension - Popup Script
// Handles user interactions and communicates with content scripts

const SAFETRANSFER_URL = 'https://safetransfer-pi.vercel.app';

// System detection patterns
const SYSTEMS = {
    western_union: {
        name: 'Western Union',
        patterns: ['westernunion.com', 'westernunion.it'],
        color: '#FFD100'
    },
    ria: {
        name: 'Ria',
        patterns: ['riamoneytransfer.com', 'ria.com'],
        color: '#FF6B00'
    },
    moneygram: {
        name: 'MoneyGram',
        patterns: ['moneygram.com', 'moneygram.it'],
        color: '#FF5722'
    },
    mondial_bony: {
        name: 'Mondial Bony',
        patterns: ['mondialbony.com', 'mondialbonyservice.it'],
        color: '#1E88E5'
    },
    monty: {
        name: 'Monty',
        patterns: ['monty.it'],
        color: '#9C27B0'
    }
};

let currentTab = null;
let detectedSystem = null;
let capturedData = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await detectCurrentSystem();
    setupEventListeners();
});

// Detect which money transfer system is currently open
async function detectCurrentSystem() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;

        if (!tab.url) return;

        const url = tab.url.toLowerCase();

        for (const [key, system] of Object.entries(SYSTEMS)) {
            if (system.patterns.some(pattern => url.includes(pattern))) {
                detectedSystem = key;
                showDetectedSystem(system.name);
                return;
            }
        }

        // No system detected
        showStatus('info', 'Abre una página de Western Union, Ria, MoneyGram o Mondial Bony para capturar datos.');

    } catch (error) {
        console.error('Error detecting system:', error);
    }
}

// Show detected system in UI
function showDetectedSystem(name) {
    const container = document.getElementById('detected-system');
    const systemName = document.getElementById('system-name');

    container.classList.remove('hidden');
    systemName.textContent = name;
}

// Show status message
function showStatus(type, message) {
    const statusBar = document.getElementById('status-bar');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');

    statusBar.className = `status-bar ${type}`;
    statusIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    statusText.textContent = message;
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('btn-capture-client').addEventListener('click', () => captureData('client'));
    document.getElementById('btn-capture-transfer').addEventListener('click', () => captureData('transfer'));
    document.getElementById('btn-capture-both').addEventListener('click', () => captureData('both'));
    document.getElementById('btn-send').addEventListener('click', sendToSafeTransfer);
    document.getElementById('btn-cancel').addEventListener('click', cancelCapture);
    document.getElementById('btn-manual').addEventListener('click', openManualEntry);
}

// Capture data from current page
async function captureData(type) {
    if (!currentTab || !detectedSystem) {
        showStatus('error', 'No se detectó un sistema de transferencias compatible.');
        return;
    }

    const btn = document.getElementById(`btn-capture-${type === 'both' ? 'both' : type}`);
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        // Inject content script and capture data
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: extractPageData,
            args: [detectedSystem, type]
        });

        if (results && results[0] && results[0].result) {
            capturedData = results[0].result;
            capturedData.system = detectedSystem;
            capturedData.captureType = type;

            showPreview(capturedData);
            showStatus('success', `Datos capturados de ${SYSTEMS[detectedSystem].name}`);
        } else {
            showStatus('error', 'No se pudieron extraer los datos. Verifica que estés en la página correcta.');
        }

    } catch (error) {
        console.error('Capture error:', error);
        showStatus('error', 'Error al capturar datos: ' + error.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Extract data from the page (injected into content)
function extractPageData(system, type) {
    const data = {
        client: {},
        transfer: {}
    };

    // Helper function to get text content safely
    const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
    };

    // Helper to find text by label
    const getByLabel = (labelText) => {
        const labels = document.querySelectorAll('label, th, td, span, div');
        for (const label of labels) {
            if (label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
                // Check next sibling, parent's next sibling, or adjacent element
                const next = label.nextElementSibling;
                if (next) {
                    const input = next.querySelector('input, select');
                    if (input) return input.value;
                    return next.textContent.trim();
                }
                // Check if it's a table row
                const row = label.closest('tr');
                if (row) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1) return cells[cells.length - 1].textContent.trim();
                }
            }
        }
        return '';
    };

    // Generic text extraction from visible page
    const pageText = document.body.innerText;

    // Extract patterns common across systems
    const patterns = {
        // Client patterns
        name: /(?:nombre|name|mittente|cognome)[\s:]*([A-Za-zÀ-ÿ\s]+)/i,
        document: /(?:documento|document|passaporto|passport|cedula)[\s:]*([A-Z0-9]+)/i,
        fiscalCode: /(?:codice fiscale|fiscal code|cf)[\s:]*([A-Z0-9]{16})/i,
        phone: /(?:telefono|phone|tel)[\s:]*(\+?[\d\s\-]+)/i,
        birthDate: /(?:nascita|birth|nato)[\s:]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        address: /(?:indirizzo|address|via)[\s:]*([A-Za-zÀ-ÿ0-9\s,\.]+)/i,

        // Transfer patterns
        amount: /(?:importo|amount|monto|€|EUR)[\s:]*(\d+[\.,]?\d*)/i,
        recipient: /(?:destinatario|beneficiario|recipient)[\s:]*([A-Za-zÀ-ÿ\s]+)/i,
        country: /(?:paese|country|destino|destinazione)[\s:]*([A-Za-zÀ-ÿ\s]+)/i,
        reference: /(?:mtcn|pin|riferimento|reference|ref)[\s#:]*([A-Z0-9\-]+)/i,
        commission: /(?:commissione|commission|fee)[\s:]*(\d+[\.,]?\d*)/i
    };

    // Extract client data
    if (type === 'client' || type === 'both') {
        for (const [field, pattern] of Object.entries(patterns)) {
            if (['name', 'document', 'fiscalCode', 'phone', 'birthDate', 'address'].includes(field)) {
                const match = pageText.match(pattern);
                if (match) {
                    data.client[field] = match[1].trim();
                }
            }
        }

        // Also try to find by common labels
        data.client.name = data.client.name || getByLabel('nome') || getByLabel('mittente');
        data.client.document = data.client.document || getByLabel('documento') || getByLabel('numero doc');
        data.client.fiscalCode = data.client.fiscalCode || getByLabel('codice fiscale');
        data.client.phone = data.client.phone || getByLabel('telefono');
    }

    // Extract transfer data
    if (type === 'transfer' || type === 'both') {
        for (const [field, pattern] of Object.entries(patterns)) {
            if (['amount', 'recipient', 'country', 'reference', 'commission'].includes(field)) {
                const match = pageText.match(pattern);
                if (match) {
                    data.transfer[field] = match[1].trim();
                }
            }
        }

        // Also try to find by common labels
        data.transfer.amount = data.transfer.amount || getByLabel('importo') || getByLabel('inviato');
        data.transfer.recipient = data.transfer.recipient || getByLabel('destinatario') || getByLabel('beneficiario');
        data.transfer.country = data.transfer.country || getByLabel('paese') || getByLabel('destinazione');
        data.transfer.reference = data.transfer.reference || getByLabel('mtcn') || getByLabel('pin') || getByLabel('riferimento');
    }

    return data;
}

// Show captured data preview
function showPreview(data) {
    const previewSection = document.getElementById('preview-section');
    const previewData = document.getElementById('preview-data');

    let html = '';

    if (data.client && Object.keys(data.client).length > 0) {
        html += '<div style="color: #60a5fa; font-size: 11px; margin-bottom: 4px;">CLIENTE</div>';
        for (const [key, value] of Object.entries(data.client)) {
            if (value) {
                html += `<div class="field">
          <span class="field-label">${formatFieldName(key)}</span>
          <span class="field-value">${value}</span>
        </div>`;
            }
        }
    }

    if (data.transfer && Object.keys(data.transfer).length > 0) {
        html += '<div style="color: #22c55e; font-size: 11px; margin: 8px 0 4px;">TRANSFERENCIA</div>';
        for (const [key, value] of Object.entries(data.transfer)) {
            if (value) {
                html += `<div class="field">
          <span class="field-label">${formatFieldName(key)}</span>
          <span class="field-value">${value}</span>
        </div>`;
            }
        }
    }

    if (!html) {
        html = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">No se encontraron datos</div>';
    }

    previewData.innerHTML = html;
    previewSection.classList.remove('hidden');
}

// Format field names for display
function formatFieldName(key) {
    const names = {
        name: 'Nombre',
        document: 'Documento',
        fiscalCode: 'Código Fiscal',
        phone: 'Teléfono',
        birthDate: 'Fecha Nac.',
        address: 'Dirección',
        amount: 'Monto',
        recipient: 'Destinatario',
        country: 'País Destino',
        reference: 'Referencia',
        commission: 'Comisión'
    };
    return names[key] || key;
}

// Send captured data to SafeTransfer
async function sendToSafeTransfer() {
    if (!capturedData) return;

    try {
        // Store data temporarily
        await chrome.storage.local.set({ pendingCapture: capturedData });

        // Open SafeTransfer with the data
        const params = new URLSearchParams({
            action: 'import',
            data: JSON.stringify(capturedData)
        });

        window.open(`${SAFETRANSFER_URL}?${params.toString()}`, '_blank');

        showStatus('success', '¡Datos enviados a SafeTransfer!');

        // Close popup after a moment
        setTimeout(() => window.close(), 1500);

    } catch (error) {
        console.error('Error sending data:', error);
        showStatus('error', 'Error al enviar datos');
    }
}

// Cancel capture
function cancelCapture() {
    capturedData = null;
    document.getElementById('preview-section').classList.add('hidden');
    document.getElementById('status-bar').classList.add('hidden');
}

// Open manual entry in SafeTransfer
function openManualEntry() {
    window.open(SAFETRANSFER_URL, '_blank');
    window.close();
}
