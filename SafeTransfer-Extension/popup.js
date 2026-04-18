// SafeTransfer Extension - Popup Script
// Handles user interactions, settings, and communicates with content scripts

// ============================================================
// DEFAULT RECEIPT URL PATTERNS BY SYSTEM
// ============================================================
const SYSTEM_PRESETS = {
    western_union: [
        '*://*.westernunion.com/*/receipt*',
        '*://*.westernunion.com/*/confirmation*',
        '*://*.westernunion.it/*/receipt*',
        '*://*.westernunion.it/*/confirmation*',
    ],
    ria: [
        '*://*.riamoneytransfer.com/*/receipt*',
        '*://*.riamoneytransfer.com/*/summary*',
        '*://*.riamoneytransfer.com/*/print*',
    ],
    moneygram: [
        '*://*.moneygram.com/*/receipt*',
        '*://*.moneygram.com/*/confirmation*',
        '*://*.moneygram.it/*/receipt*',
    ],
    mondial_bony: [
        '*://*.mondialbony.com/*/receipt*',
        '*://*.mondialbonyservice.it/*/print*',
        '*://*.mondialbonyservice.it/*/receipt*',
    ],
    monty: [
        '*://*.monty.it/*/receipt*',
        '*://*.monty.it/*/print*',
    ]
};

// All default patterns combined
const ALL_DEFAULT_PATTERNS = Object.values(SYSTEM_PRESETS).flat();

// System detection patterns for active tab
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
let currentSettings = {};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await detectCurrentSystem();
    setupEventListeners();
    updateAutoDetectStatus();
});

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================

async function loadSettings() {
    try {
        const result = await chrome.storage.local.get('settings');
        currentSettings = result.settings || {
            autoDetect: true,
            showNotifications: true,
            safetransferUrl: 'https://safetransfer.it',
            receiptPatterns: [...ALL_DEFAULT_PATTERNS]
        };

        // Populate settings form
        document.getElementById('setting-url').value = currentSettings.safetransferUrl || 'https://safetransfer.it';
        document.getElementById('setting-autodetect').checked = currentSettings.autoDetect !== false;

        renderUrlList();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    try {
        await chrome.storage.local.set({ settings: currentSettings });

        // Notify background script of updated patterns
        chrome.runtime.sendMessage({
            type: 'UPDATE_RECEIPT_PATTERNS',
            patterns: currentSettings.receiptPatterns || []
        });

        showSaveStatus();
        updateAutoDetectStatus();
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function showSaveStatus() {
    const status = document.getElementById('settings-save-status');
    status.classList.remove('hidden');
    // Re-trigger animation
    status.style.animation = 'none';
    status.offsetHeight; // trigger reflow
    status.style.animation = 'fade-in-out 2s ease-in-out';
    setTimeout(() => status.classList.add('hidden'), 2000);
}

// ============================================================
// URL LIST RENDERING
// ============================================================

function getSystemForUrl(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('westernunion')) return { key: 'wu', name: 'WU' };
    if (urlLower.includes('riamoneytransfer') || urlLower.includes('ria.com')) return { key: 'ria', name: 'Ria' };
    if (urlLower.includes('moneygram')) return { key: 'mg', name: 'MG' };
    if (urlLower.includes('mondialbony')) return { key: 'mb', name: 'MB' };
    if (urlLower.includes('monty')) return { key: 'monty', name: 'Monty' };
    return { key: 'custom', name: '?' };
}

function renderUrlList() {
    const list = document.getElementById('url-list');
    const patterns = currentSettings.receiptPatterns || [];

    if (patterns.length === 0) {
        list.innerHTML = `
            <div class="url-list-empty">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                <div>Nessuna URL configurata</div>
                <div style="margin-top:4px;">Aggiungi URL o usa i pulsanti rapidi sotto</div>
            </div>
        `;
        updatePatternCount(0);
        return;
    }

    list.innerHTML = patterns.map((url, index) => {
        const system = getSystemForUrl(url);
        return `
            <div class="url-item" data-index="${index}">
                <span class="url-system-badge ${system.key}">${system.name}</span>
                <span class="url-text" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
                <button class="btn-delete-url" data-index="${index}" title="Rimuovi">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    // Attach delete handlers
    list.querySelectorAll('.btn-delete-url').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            removeUrl(index);
        });
    });

    updatePatternCount(patterns.length);
}

function updatePatternCount(count) {
    const el = document.getElementById('pattern-count');
    if (el) el.textContent = count;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// URL MANAGEMENT
// ============================================================

function addUrl(url) {
    url = url.trim();
    if (!url) return;

    if (!currentSettings.receiptPatterns) {
        currentSettings.receiptPatterns = [];
    }

    // Avoid duplicates
    if (currentSettings.receiptPatterns.includes(url)) {
        return;
    }

    currentSettings.receiptPatterns.push(url);
    renderUrlList();
    saveSettings();
}

function removeUrl(index) {
    if (!currentSettings.receiptPatterns) return;
    currentSettings.receiptPatterns.splice(index, 1);
    renderUrlList();
    saveSettings();
}

function addSystemPreset(systemKey) {
    const presetUrls = SYSTEM_PRESETS[systemKey];
    if (!presetUrls) return;

    if (!currentSettings.receiptPatterns) {
        currentSettings.receiptPatterns = [];
    }

    let added = 0;
    for (const url of presetUrls) {
        if (!currentSettings.receiptPatterns.includes(url)) {
            currentSettings.receiptPatterns.push(url);
            added++;
        }
    }

    renderUrlList();
    if (added > 0) {
        saveSettings();
    }

    return added;
}

function resetToDefaults() {
    currentSettings.receiptPatterns = [...ALL_DEFAULT_PATTERNS];
    renderUrlList();
    saveSettings();
}

// ============================================================
// AUTO-DETECT STATUS
// ============================================================

function updateAutoDetectStatus() {
    const container = document.getElementById('autodetect-status');
    const indicator = document.getElementById('autodetect-indicator');
    const count = (currentSettings.receiptPatterns || []).length;

    if (count > 0 && currentSettings.autoDetect !== false) {
        container.classList.remove('hidden');
        indicator.className = 'autodetect-dot active';
    } else if (count > 0) {
        container.classList.remove('hidden');
        indicator.className = 'autodetect-dot inactive';
    } else {
        container.classList.add('hidden');
    }

    updatePatternCount(count);
}

// ============================================================
// VIEW SWITCHING
// ============================================================

function showSettingsView() {
    document.getElementById('main-view').classList.add('hidden');
    document.getElementById('settings-view').classList.remove('hidden');
}

function showMainView() {
    document.getElementById('settings-view').classList.add('hidden');
    document.getElementById('main-view').classList.remove('hidden');
    updateAutoDetectStatus();
}

// ============================================================
// SYSTEM DETECTION
// ============================================================

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
        showStatus('info', 'Apri una pagina di Western Union, Ria, MoneyGram, Mondial Bony o Monty per catturare i dati.');

    } catch (error) {
        console.error('Error detecting system:', error);
    }
}

function showDetectedSystem(name) {
    const container = document.getElementById('detected-system');
    const systemName = document.getElementById('system-name');

    container.classList.remove('hidden');
    systemName.textContent = name;
}

// ============================================================
// STATUS MESSAGES
// ============================================================

function showStatus(type, message) {
    const statusBar = document.getElementById('status-bar');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');

    statusBar.className = `status-bar ${type}`;
    statusIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    statusText.textContent = message;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Main view buttons
    document.getElementById('btn-capture-client').addEventListener('click', () => captureData('client'));
    document.getElementById('btn-capture-transfer').addEventListener('click', () => captureData('transfer'));
    document.getElementById('btn-capture-both').addEventListener('click', () => captureData('both'));
    document.getElementById('btn-send').addEventListener('click', sendToSafeTransfer);
    document.getElementById('btn-cancel').addEventListener('click', cancelCapture);
    document.getElementById('btn-manual').addEventListener('click', openManualEntry);

    // Open app link
    document.getElementById('open-app').addEventListener('click', (e) => {
        e.preventDefault();
        const url = currentSettings.safetransferUrl || 'https://safetransfer.it';
        window.open(url, '_blank');
        window.close();
    });

    // Settings navigation
    document.getElementById('btn-settings').addEventListener('click', showSettingsView);
    document.getElementById('btn-back').addEventListener('click', showMainView);

    // Settings fields
    document.getElementById('setting-url').addEventListener('change', (e) => {
        currentSettings.safetransferUrl = e.target.value.trim() || 'https://safetransfer.it';
        saveSettings();
    });

    document.getElementById('setting-autodetect').addEventListener('change', (e) => {
        currentSettings.autoDetect = e.target.checked;
        saveSettings();
    });

    // Add URL
    document.getElementById('btn-add-url').addEventListener('click', () => {
        const input = document.getElementById('new-url-input');
        addUrl(input.value);
        input.value = '';
        input.focus();
    });

    document.getElementById('new-url-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addUrl(e.target.value);
            e.target.value = '';
        }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const system = btn.dataset.system;
            const added = addSystemPreset(system);
            btn.classList.add('added');
            btn.textContent = added > 0 ? `✓ ${btn.textContent}` : btn.textContent;
            setTimeout(() => {
                btn.classList.remove('added');
                // Remove the checkmark
                btn.textContent = btn.textContent.replace('✓ ', '');
            }, 2000);
        });
    });

    // Reset URL button
    document.getElementById('btn-reset-urls').addEventListener('click', () => {
        if (confirm('Ripristinare tutte le URL predefinite? Le URL personalizzate saranno rimosse.')) {
            resetToDefaults();
        }
    });
}

// ============================================================
// DATA CAPTURE
// ============================================================

async function captureData(type) {
    if (!currentTab || !detectedSystem) {
        showStatus('error', 'Nessun sistema di trasferimento compatibile rilevato.');
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
            showStatus('success', `Dati catturati da ${SYSTEMS[detectedSystem].name}`);
        } else {
            showStatus('error', 'Impossibile estrarre i dati. Verifica di essere nella pagina corretta.');
        }

    } catch (error) {
        console.error('Capture error:', error);
        showStatus('error', 'Errore nella cattura dei dati: ' + error.message);
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
                const next = label.nextElementSibling;
                if (next) {
                    const input = next.querySelector('input, select');
                    if (input) return input.value;
                    return next.textContent.trim();
                }
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
        name: /(?:nombre|name|mittente|cognome)[\s:]*([A-Za-zÀ-ÿ\s]+)/i,
        document: /(?:documento|document|passaporto|passport|cedula)[\s:]*([A-Z0-9]+)/i,
        fiscalCode: /(?:codice fiscale|fiscal code|cf)[\s:]*([A-Z0-9]{16})/i,
        phone: /(?:telefono|phone|tel)[\s:]*(\+?[\d\s\-]+)/i,
        birthDate: /(?:nascita|birth|nato)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        address: /(?:indirizzo|address|via)[\s:]*([A-Za-zÀ-ÿ0-9\s,\.]+)/i,
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

        data.transfer.amount = data.transfer.amount || getByLabel('importo') || getByLabel('inviato');
        data.transfer.recipient = data.transfer.recipient || getByLabel('destinatario') || getByLabel('beneficiario');
        data.transfer.country = data.transfer.country || getByLabel('paese') || getByLabel('destinazione');
        data.transfer.reference = data.transfer.reference || getByLabel('mtcn') || getByLabel('pin') || getByLabel('riferimento');
    }

    return data;
}

// ============================================================
// PREVIEW & SEND
// ============================================================

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
        html += '<div style="color: #22c55e; font-size: 11px; margin: 8px 0 4px;">TRASFERIMENTO</div>';
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
        html = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">Nessun dato trovato</div>';
    }

    previewData.innerHTML = html;
    previewSection.classList.remove('hidden');
}

function formatFieldName(key) {
    const names = {
        name: 'Nome',
        document: 'Documento',
        fiscalCode: 'Codice Fiscale',
        phone: 'Telefono',
        birthDate: 'Data Nascita',
        address: 'Indirizzo',
        amount: 'Importo',
        recipient: 'Destinatario',
        country: 'Paese Dest.',
        reference: 'Riferimento',
        commission: 'Commissione'
    };
    return names[key] || key;
}

async function sendToSafeTransfer() {
    if (!capturedData) return;

    try {
        // Store data temporarily
        await chrome.storage.local.set({ pendingCapture: capturedData });

        // Open SafeTransfer with the data
        const baseUrl = currentSettings.safetransferUrl || 'https://safetransfer.it';
        const params = new URLSearchParams({
            action: 'import',
            data: JSON.stringify(capturedData)
        });

        window.open(`${baseUrl}?${params.toString()}`, '_blank');

        showStatus('success', 'Dati inviati a SafeTransfer!');

        // Close popup after a moment
        setTimeout(() => window.close(), 1500);

    } catch (error) {
        console.error('Error sending data:', error);
        showStatus('error', 'Errore nell\'invio dei dati');
    }
}

function cancelCapture() {
    capturedData = null;
    document.getElementById('preview-section').classList.add('hidden');
    document.getElementById('status-bar').classList.add('hidden');
}

function openManualEntry() {
    const url = currentSettings.safetransferUrl || 'https://safetransfer.it';
    window.open(url, '_blank');
    window.close();
}
