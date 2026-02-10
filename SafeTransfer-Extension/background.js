// SafeTransfer Extension - Background Service Worker

// ============================================================
// RECEIPT URL PATTERNS - Aggiungi qui le URL delle pagine ricevuta
// Quando l'impiegato arriva a queste pagine, l'estensione
// mostra un promemoria per esportare i dati in SafeTransfer.
//
// Usa '*' come wildcard. Esempi:
//   '*://wumt.westernunion.com/*/receipt*'
//   '*://agent.riamoneytransfer.com/*/print*'
// ============================================================
const DEFAULT_RECEIPT_PATTERNS = [
    // Western Union - aggiungi URL esatte quando disponibili
    '*://*.westernunion.com/*/receipt*',
    '*://*.westernunion.com/*/confirmation*',
    '*://*.westernunion.it/*/receipt*',
    '*://*.westernunion.it/*/confirmation*',
    // Ria Money Transfer
    '*://*.riamoneytransfer.com/*/receipt*',
    '*://*.riamoneytransfer.com/*/summary*',
    '*://*.riamoneytransfer.com/*/print*',
    // MoneyGram
    '*://*.moneygram.com/*/receipt*',
    '*://*.moneygram.com/*/confirmation*',
    '*://*.moneygram.it/*/receipt*',
    // Mondial Bony
    '*://*.mondialbony.com/*/receipt*',
    '*://*.mondialbonyservice.it/*/print*',
    '*://*.mondialbonyservice.it/*/receipt*',
    // Monty
    '*://*.monty.it/*/receipt*',
    '*://*.monty.it/*/print*',
];

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('SafeTransfer Extension installed:', details.reason);

    // Set default settings
    chrome.storage.local.set({
        settings: {
            autoDetect: true,
            showNotifications: true,
            safetransferUrl: 'https://safetransfer.it',
            receiptPatterns: DEFAULT_RECEIPT_PATTERNS
        }
    });
});

// ============================================================
// RECEIPT PAGE DETECTION
// Monitors tab URL changes and shows a reminder when the
// employee reaches a receipt/confirmation page.
// ============================================================

// Convert wildcard pattern to regex
function patternToRegex(pattern) {
    const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$', 'i');
}

// Check if URL matches any receipt pattern
function isReceiptPage(url, patterns) {
    return patterns.some(pattern => patternToRegex(pattern).test(url));
}

// Show badge on extension icon
function showReceiptBadge(tabId) {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
}

// Clear badge
function clearReceiptBadge(tabId) {
    chrome.action.setBadgeText({ text: '', tabId });
}

// Monitor tab updates for receipt pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
        const result = await chrome.storage.local.get('settings');
        const settings = result.settings || {};
        const patterns = settings.receiptPatterns || DEFAULT_RECEIPT_PATTERNS;

        if (settings.autoDetect !== false && isReceiptPage(tab.url, patterns)) {
            console.log('Receipt page detected:', tab.url);
            showReceiptBadge(tabId);

            // Notify content script to show reminder banner
            try {
                await chrome.tabs.sendMessage(tabId, {
                    type: 'RECEIPT_PAGE_DETECTED',
                    url: tab.url
                });
            } catch (e) {
                // Content script might not be loaded yet
                console.log('Content script not ready, retrying...');
                setTimeout(async () => {
                    try {
                        await chrome.tabs.sendMessage(tabId, {
                            type: 'RECEIPT_PAGE_DETECTED',
                            url: tab.url
                        });
                    } catch (e2) {
                        console.log('Content script not available');
                    }
                }, 1500);
            }
        } else {
            clearReceiptBadge(tabId);
        }
    } catch (error) {
        console.error('Error checking receipt page:', error);
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.type) {
        case 'CAPTURE_DATA':
            handleCaptureData(message.data, sender.tab);
            sendResponse({ success: true });
            break;

        case 'OPEN_SAFETRANSFER':
            openSafeTransferWithData(message.data);
            sendResponse({ success: true });
            break;

        case 'GET_SETTINGS':
            chrome.storage.local.get('settings', (result) => {
                sendResponse(result.settings || {});
            });
            return true;

        case 'RECEIPT_EXPORTED':
            // Clear badge when employee confirms export
            if (sender.tab?.id) clearReceiptBadge(sender.tab.id);
            sendResponse({ success: true });
            break;

        case 'UPDATE_RECEIPT_PATTERNS':
            chrome.storage.local.get('settings', (result) => {
                const settings = result.settings || {};
                settings.receiptPatterns = message.patterns;
                chrome.storage.local.set({ settings });
                sendResponse({ success: true });
            });
            return true;
    }
});

// Handle captured data
async function handleCaptureData(data, tab) {
    try {
        await chrome.storage.local.set({
            lastCapture: {
                data: data,
                timestamp: Date.now(),
                source: tab?.url || 'unknown'
            }
        });
        console.log('Data captured and stored');
    } catch (error) {
        console.error('Error handling capture:', error);
    }
}

// Open SafeTransfer with captured data
async function openSafeTransferWithData(data) {
    try {
        const result = await chrome.storage.local.get('settings');
        const baseUrl = result.settings?.safetransferUrl || 'https://safetransfer.it';

        const params = new URLSearchParams({
            action: 'import',
            data: JSON.stringify(data)
        });

        chrome.tabs.create({
            url: `${baseUrl}?${params.toString()}`
        });
    } catch (error) {
        console.error('Error opening SafeTransfer:', error);
    }
}
