// SafeTransfer Extension - Background Service Worker

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('SafeTransfer Extension installed:', details.reason);

    // Set default settings
    chrome.storage.local.set({
        settings: {
            autoDetect: true,
            showNotifications: true,
            safetransferUrl: 'https://safetransfer.it'
        }
    });
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
