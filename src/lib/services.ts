/**
 * Services Index
 * Exporta todos los servicios de la aplicación para un acceso centralizado
 */

export { clientService, type ClientServiceResult, type SearchResult } from './clientService';

export {
    transferService,
    type TransferServiceResult,
    type EligibilityResult,
    TRANSFER_LIMITS,
} from './transferService';

// Re-export individual functions for tree-shaking
export {
    searchExistingClient,
    getClientsByBusiness,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
    checkDocumentExists,
} from './clientService';

export {
    checkTransferEligibility,
    validateTransferAmount,
    createTransfer,
    getTransfersByBusiness,
    getTransfersByClient,
    getTransferById,
    getWeeklySummary,
    cancelTransfer,
} from './transferService';
