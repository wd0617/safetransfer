// SafeTransfer Extension - Content Script
// Injected into money transfer websites to help extract data

console.log('SafeTransfer content script loaded');

// Add visual indicator that extension is active
function addExtensionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'safetransfer-indicator';
    indicator.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f1c2e 100%);
      color: white;
      padding: 10px 16px;
      border-radius: 25px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 999999;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
      <span>SafeTransfer Activo</span>
    </div>
  `;

    indicator.onclick = () => {
        // Remove indicator on click or after 5 seconds
        indicator.remove();
    };

    document.body.appendChild(indicator);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.5s';
            setTimeout(() => indicator.remove(), 500);
        }
    }, 5000);
}

// Only show indicator if on a supported site
const currentUrl = window.location.href.toLowerCase();
const supportedSites = [
    'westernunion',
    'riamoneytransfer',
    'moneygram',
    'mondialbony'
];

if (supportedSites.some(site => currentUrl.includes(site))) {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addExtensionIndicator);
    } else {
        addExtensionIndicator();
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_DATA') {
        const data = extractDataFromPage(message.system, message.captureType);
        sendResponse(data);
    }
    return true;
});

// Main extraction function
function extractDataFromPage(system, captureType) {
    const result = {
        client: {},
        transfer: {},
        raw: {}
    };

    // Get all visible text
    const pageText = document.body.innerText;
    result.raw.pageText = pageText.substring(0, 5000); // First 5000 chars for debugging

    // System-specific extraction
    switch (system) {
        case 'western_union':
            extractWesternUnion(result, captureType);
            break;
        case 'ria':
            extractRia(result, captureType);
            break;
        case 'moneygram':
            extractMoneyGram(result, captureType);
            break;
        case 'mondial_bony':
            extractMondialBony(result, captureType);
            break;
        default:
            extractGeneric(result, captureType);
    }

    return result;
}

// Western Union specific extraction
function extractWesternUnion(result, captureType) {
    const pageText = document.body.innerText;

    // MTCN (Money Transfer Control Number)
    const mtcnMatch = pageText.match(/MTCN[:\s]*(\d{3}[-\s]?\d{3}[-\s]?\d{4})/i);
    if (mtcnMatch) result.transfer.reference = mtcnMatch[1].replace(/[-\s]/g, '');

    // Sender/Mittente
    const senderMatch = pageText.match(/Mittente[:\s]*([A-Za-zÀ-ÿ\s]+?)(?:\n|Data|Luogo)/i);
    if (senderMatch) result.client.name = senderMatch[1].trim();

    // Amount
    const amountMatch = pageText.match(/Importo inviato[:\s]*(\d+[\.,]?\d*)/i);
    if (amountMatch) result.transfer.amount = amountMatch[1];

    // Recipient/Destinatario
    const recipientMatch = pageText.match(/Destinatario[:\s]*([A-Za-zÀ-ÿ\s]+?)(?:\n|Città)/i);
    if (recipientMatch) result.transfer.recipient = recipientMatch[1].trim();

    // Country
    const countryMatch = pageText.match(/Paese di destinazione[:\s]*([A-Za-zÀ-ÿ\s]+)/i);
    if (countryMatch) result.transfer.country = countryMatch[1].trim();

    // Document
    const docMatch = pageText.match(/Numero del documento[:\s]*([A-Z0-9]+)/i);
    if (docMatch) result.client.document = docMatch[1];

    // Fiscal Code
    const fiscalMatch = pageText.match(/Codice Fiscale[:\s]*([A-Z0-9]{16})/i);
    if (fiscalMatch) result.client.fiscalCode = fiscalMatch[1];

    // Birth Date
    const birthMatch = pageText.match(/Data Nascita[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (birthMatch) result.client.birthDate = birthMatch[1];
}

// Ria specific extraction
function extractRia(result, captureType) {
    const pageText = document.body.innerText;

    // Order Number
    const orderMatch = pageText.match(/Ordine No\.\s*(\w+)/i);
    if (orderMatch) result.transfer.reference = orderMatch[1];

    // PIN
    const pinMatch = pageText.match(/PIN\s*(\d+)/i);
    if (pinMatch) result.transfer.pin = pinMatch[1];

    // Client Name
    const nameMatch = pageText.match(/Nome e cognome del cliente\s*([A-Za-zÀ-ÿ\s]+?)(?:\n|Codice)/i);
    if (nameMatch) result.client.name = nameMatch[1].trim();

    // Passport/Document
    const passportMatch = pageText.match(/Passaporto\s*([A-Z0-9]+)/i);
    if (passportMatch) result.client.document = passportMatch[1];

    // Fiscal Code
    const fiscalMatch = pageText.match(/Codice fiscale\s*([A-Z0-9]{16})/i);
    if (fiscalMatch) result.client.fiscalCode = fiscalMatch[1];

    // Amount
    const amountMatch = pageText.match(/Importo da Ricevere\s*EUR\s*(\d+[\.,]?\d*)/i);
    if (amountMatch) result.transfer.amount = amountMatch[1];

    // Beneficiary
    const benefMatch = pageText.match(/Nome e cognome del beneficiario\s*([A-Za-zÀ-ÿ\s]+)/i);
    if (benefMatch) result.transfer.recipient = benefMatch[1].trim();

    // Country
    const countryMatch = pageText.match(/Paese di nascita\s*(\w+)/i);
    if (countryMatch) result.transfer.country = countryMatch[1];
}

// MoneyGram specific extraction
function extractMoneyGram(result, captureType) {
    const pageText = document.body.innerText;

    // Reference number
    const refMatch = pageText.match(/Numero di riferimento[:\s]*(\d+)/i);
    if (refMatch) result.transfer.reference = refMatch[1];

    // Sender
    const senderMatch = pageText.match(/Informazioni Mittente[:\s]*([A-Za-zÀ-ÿ\s]+?)(?:\n|VIA)/i);
    if (senderMatch) result.client.name = senderMatch[1].trim();

    // Amount
    const amountMatch = pageText.match(/Importo di trasferimento\s*(\d+[\.,]?\d*)\s*EUR/i);
    if (amountMatch) result.transfer.amount = amountMatch[1];

    // Total paid
    const totalMatch = pageText.match(/Importo totale pagato[:\s]*(\d+[\.,]?\d*)\s*EUR/i);
    if (totalMatch) result.transfer.totalPaid = totalMatch[1];

    // Recipient
    const recipientMatch = pageText.match(/Informazioni sul destinatario[:\s]*([A-Za-zÀ-ÿ\s]+)/i);
    if (recipientMatch) result.transfer.recipient = recipientMatch[1].trim();

    // Destination
    const destMatch = pageText.match(/Destinazione\s*(\w+)/i);
    if (destMatch) result.transfer.country = destMatch[1];

    // Document number
    const docMatch = pageText.match(/N\. documento[:\s]*\d[:\s]*([A-Z0-9]+)/i);
    if (docMatch) result.client.document = docMatch[1];

    // Birth Date
    const birthMatch = pageText.match(/Data di Nascita[:\s]*(\d{1,2}\s*\w+\s*\d{4})/i);
    if (birthMatch) result.client.birthDate = birthMatch[1];
}

// Mondial Bony specific extraction
function extractMondialBony(result, captureType) {
    const pageText = document.body.innerText;

    // PIN
    const pinMatch = pageText.match(/PIN\s*(\d+)/i);
    if (pinMatch) result.transfer.reference = pinMatch[1];

    // Ref Number
    const refMatch = pageText.match(/Ref\. Num\.\s*(\d+)/i);
    if (refMatch) result.transfer.refNum = refMatch[1];

    // Sender Name (Cognome/Nome format)
    const senderMatch = pageText.match(/Cognome\s*([A-Za-zÀ-ÿ\s]+)/i);
    if (senderMatch) result.client.name = senderMatch[1].trim();

    // Sender Phone
    const phoneMatch = pageText.match(/Tel\.\s*(\d+)/i);
    if (phoneMatch) result.client.phone = phoneMatch[1];

    // Birth Date
    const birthMatch = pageText.match(/Data di Nascita\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (birthMatch) result.client.birthDate = birthMatch[1];

    // Document
    const docMatch = pageText.match(/Numero doc\.\s*([A-Z0-9]+)/i);
    if (docMatch) result.client.document = docMatch[1];

    // Fiscal Code
    const fiscalMatch = pageText.match(/Codice Fiscale\s*([A-Z0-9]{16})/i);
    if (fiscalMatch) result.client.fiscalCode = fiscalMatch[1];

    // Amount sent
    const amountMatch = pageText.match(/Importo inviato\s*(\d+[\.,]?\d*)/i);
    if (amountMatch) result.transfer.amount = amountMatch[1];

    // Recipient
    const recipientMatch = pageText.match(/Nome\s*([A-Za-zÀ-ÿ\s]+?)(?:\n|Tel)/i);
    if (recipientMatch) result.transfer.recipient = recipientMatch[1].trim();

    // Country
    const countryMatch = pageText.match(/Paese\s*([A-Za-zÀ-ÿ]+)/i);
    if (countryMatch) result.transfer.country = countryMatch[1];
}

// Generic extraction fallback
function extractGeneric(result, captureType) {
    const pageText = document.body.innerText;

    // Try common patterns
    const patterns = {
        name: /(?:nome|name|mittente)[:\s]*([A-Za-zÀ-ÿ\s]+?)(?:\n|$)/i,
        document: /(?:documento|document|passaporto)[:\s]*([A-Z0-9]+)/i,
        fiscalCode: /(?:codice fiscale|cf)[:\s]*([A-Z0-9]{16})/i,
        phone: /(?:telefono|phone|tel)[:\s]*([\d\+\-\s]+)/i,
        amount: /(?:importo|amount|€|EUR)[:\s]*(\d+[\.,]?\d*)/i,
        recipient: /(?:destinatario|beneficiario)[:\s]*([A-Za-zÀ-ÿ\s]+)/i,
        country: /(?:paese|country|destino)[:\s]*([A-Za-zÀ-ÿ]+)/i,
        reference: /(?:mtcn|pin|riferimento|ref)[:\s#]*([A-Z0-9\-]+)/i
    };

    for (const [field, pattern] of Object.entries(patterns)) {
        const match = pageText.match(pattern);
        if (match) {
            if (['name', 'document', 'fiscalCode', 'phone'].includes(field)) {
                result.client[field] = match[1].trim();
            } else {
                result.transfer[field] = match[1].trim();
            }
        }
    }
}
