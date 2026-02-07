import { supabase } from './supabase';

const MAX_AMOUNT_LIMIT = 999;
const PERIOD_DAYS = 8;

export interface TransferEligibility {
  canTransfer: boolean;
  amountUsed: number;
  amountAvailable: number;
  daysRemaining: number;
  oldestTransferDate: string | null;
  resetDate: string | null;
  message: string;
}

export async function checkClientEligibilityWithDays(
  documentNumber: string,
  businessId: string,
  userId: string,
  requestedAmount: number
): Promise<TransferEligibility> {
  try {
    const periodStartDate = new Date();
    periodStartDate.setDate(periodStartDate.getDate() - PERIOD_DAYS);

    const { data: recentTransfers, error: transfersError } = await supabase
      .from('transfers')
      .select('amount, transfer_date, client_id, clients!inner(document_number)')
      .eq('clients.document_number', documentNumber)
      .eq('status', 'completed')
      .gte('transfer_date', periodStartDate.toISOString())
      .order('transfer_date', { ascending: true });

    if (transfersError) {
      console.error('Error fetching transfers:', transfersError);
      throw transfersError;
    }

    const transfers = recentTransfers || [];
    const totalUsed = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const amountAvailable = Math.max(MAX_AMOUNT_LIMIT - totalUsed, 0);
    const canTransfer = (totalUsed + requestedAmount) <= MAX_AMOUNT_LIMIT;

    let daysRemaining = 0;
    let oldestTransferDate: string | null = null;
    let resetDate: string | null = null;

    if (transfers.length > 0) {
      const oldest = transfers[0];
      oldestTransferDate = oldest.transfer_date;

      const oldestDate = new Date(oldestTransferDate);
      const resetDateTime = new Date(oldestDate);
      resetDateTime.setDate(resetDateTime.getDate() + PERIOD_DAYS);

      resetDate = resetDateTime.toISOString();

      const now = new Date();
      const timeDiff = resetDateTime.getTime() - now.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) daysRemaining = 0;
    }

    const { data: basicCheck } = await supabase.rpc('check_transfer_eligibility_private', {
      p_document_number: documentNumber,
      p_checking_business_id: businessId,
      p_checked_by_user_id: userId,
      p_requested_amount: requestedAmount,
    });

    const message = canTransfer
      ? 'eligible'
      : daysRemaining > 0
        ? `blocked_wait_${daysRemaining}_days`
        : 'limit_exceeded';

    return {
      canTransfer,
      amountUsed: totalUsed,
      amountAvailable,
      daysRemaining,
      oldestTransferDate,
      resetDate,
      message,
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    throw error;
  }
}

export function formatDaysRemainingMessage(
  daysRemaining: number,
  amountUsed: number,
  amountAvailable: number,
  language: 'es' | 'en' | 'it' | 'hi' | 'ur' = 'es'
): string {
  const messages = {
    es: {
      blocked: `Has alcanzado tu límite semanal de €${MAX_AMOUNT_LIMIT}. Has utilizado €${amountUsed.toFixed(2)} en los últimos ${PERIOD_DAYS} días. Podrás enviar dinero nuevamente en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}.`,
      available: `Puedes enviar hasta €${amountAvailable.toFixed(2)}. Has utilizado €${amountUsed.toFixed(2)} de tu límite de €${MAX_AMOUNT_LIMIT} en los últimos ${PERIOD_DAYS} días.`,
      eligible: `Puedes realizar esta transferencia. Límite disponible: €${amountAvailable.toFixed(2)}.`,
    },
    en: {
      blocked: `You have reached your weekly limit of €${MAX_AMOUNT_LIMIT}. You have used €${amountUsed.toFixed(2)} in the last ${PERIOD_DAYS} days. You will be able to send money again in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.`,
      available: `You can send up to €${amountAvailable.toFixed(2)}. You have used €${amountUsed.toFixed(2)} of your €${MAX_AMOUNT_LIMIT} limit in the last ${PERIOD_DAYS} days.`,
      eligible: `You can make this transfer. Available limit: €${amountAvailable.toFixed(2)}.`,
    },
    it: {
      blocked: `Hai raggiunto il tuo limite settimanale di €${MAX_AMOUNT_LIMIT}. Hai utilizzato €${amountUsed.toFixed(2)} negli ultimi ${PERIOD_DAYS} giorni. Potrai inviare denaro di nuovo tra ${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'}.`,
      available: `Puoi inviare fino a €${amountAvailable.toFixed(2)}. Hai utilizzato €${amountUsed.toFixed(2)} del tuo limite di €${MAX_AMOUNT_LIMIT} negli ultimi ${PERIOD_DAYS} giorni.`,
      eligible: `Puoi effettuare questo trasferimento. Limite disponibile: €${amountAvailable.toFixed(2)}.`,
    },
    hi: {
      blocked: `आपने €${MAX_AMOUNT_LIMIT} की अपनी साप्ताहिक सीमा पूरी कर ली है। आपने पिछले ${PERIOD_DAYS} दिनों में €${amountUsed.toFixed(2)} का उपयोग किया है। आप ${daysRemaining} ${daysRemaining === 1 ? 'दिन' : 'दिनों'} में फिर से पैसे भेज सकेंगे।`,
      available: `आप €${amountAvailable.toFixed(2)} तक भेज सकते हैं। आपने पिछले ${PERIOD_DAYS} दिनों में €${MAX_AMOUNT_LIMIT} की अपनी सीमा में से €${amountUsed.toFixed(2)} का उपयोग किया है।`,
      eligible: `आप यह स्थानांतरण कर सकते हैं। उपलब्ध सीमा: €${amountAvailable.toFixed(2)}।`,
    },
    ur: {
      blocked: `آپ نے €${MAX_AMOUNT_LIMIT} کی اپنی ہفتہ وار حد پوری کر لی ہے۔ آپ نے پچھلے ${PERIOD_DAYS} دنوں میں €${amountUsed.toFixed(2)} استعمال کیا ہے۔ آپ ${daysRemaining} ${daysRemaining === 1 ? 'دن' : 'دنوں'} میں دوبارہ رقم بھیج سکیں گے۔`,
      available: `آپ €${amountAvailable.toFixed(2)} تک بھیج سکتے ہیں۔ آپ نے پچھلے ${PERIOD_DAYS} دنوں میں €${MAX_AMOUNT_LIMIT} کی اپنی حد میں سے €${amountUsed.toFixed(2)} استعمال کیا ہے۔`,
      eligible: `آپ یہ منتقلی کر سکتے ہیں۔ دستیاب حد: €${amountAvailable.toFixed(2)}۔`,
    },
  };

  const lang = messages[language] || messages.es;

  if (daysRemaining > 0 && amountAvailable < 1) {
    return lang.blocked;
  } else if (amountAvailable > 0 && amountAvailable < MAX_AMOUNT_LIMIT) {
    return lang.available;
  } else {
    return lang.eligible;
  }
}

export function calculateResetDate(oldestTransferDate: string): Date {
  const oldest = new Date(oldestTransferDate);
  const reset = new Date(oldest);
  reset.setDate(reset.getDate() + PERIOD_DAYS);
  return reset;
}

export function formatResetDate(resetDate: Date, language: 'es' | 'en' | 'it' | 'hi' | 'ur' = 'es'): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  const locales = {
    es: 'es-ES',
    en: 'en-US',
    it: 'it-IT',
    hi: 'hi-IN',
    ur: 'ur-PK',
  };

  return resetDate.toLocaleString(locales[language] || locales.es, options);
}
