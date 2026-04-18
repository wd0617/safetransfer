/**
 * Anti-Bot Protection Module
 * 
 * Provides multiple layers of bot detection:
 * 1. Honeypot fields (invisible to users, visible to bots)
 * 2. Time-based detection (bots fill forms too fast)
 * 3. Client-side rate limiting
 * 4. Cloudflare Turnstile CAPTCHA (when configured)
 */

// ─── Honeypot ────────────────────────────────────────────────────────────────

/**
 * If this field has any value, it's a bot (real users can't see it)
 */
export function isHoneypotTriggered(value: string): boolean {
    return value.length > 0;
}

// ─── Time-based Detection ────────────────────────────────────────────────────

const MIN_FORM_FILL_TIME_MS = 3000;   // 3 seconds minimum for login
const MIN_SIGNUP_FILL_TIME_MS = 8000; // 8 seconds minimum for signup (multi-step)

export function createFormTimer(): number {
    return Date.now();
}

export function isFormFilledTooFast(startTime: number, isSignUp: boolean): boolean {
    const elapsed = Date.now() - startTime;
    const minTime = isSignUp ? MIN_SIGNUP_FILL_TIME_MS : MIN_FORM_FILL_TIME_MS;
    return elapsed < minTime;
}

// ─── Client-side Rate Limiting ───────────────────────────────────────────────

interface RateLimitEntry {
    count: number;
    firstAttempt: number;
    lastAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLIENT_RATE_LIMITS: Record<string, { maxAttempts: number; windowMs: number; cooldownMs: number }> = {
    login: { maxAttempts: 5, windowMs: 5 * 60 * 1000, cooldownMs: 60 * 1000 },    // 5 per 5min, 1min cooldown
    signup: { maxAttempts: 3, windowMs: 10 * 60 * 1000, cooldownMs: 2 * 60 * 1000 }, // 3 per 10min, 2min cooldown
    forgot: { maxAttempts: 3, windowMs: 15 * 60 * 1000, cooldownMs: 3 * 60 * 1000 }, // 3 per 15min, 3min cooldown
};

export function checkClientRateLimit(action: string): { allowed: boolean; retryAfterSeconds?: number } {
    const config = CLIENT_RATE_LIMITS[action];
    if (!config) return { allowed: true };

    const now = Date.now();
    const entry = rateLimitStore.get(action);

    if (!entry) {
        rateLimitStore.set(action, { count: 1, firstAttempt: now, lastAttempt: now });
        return { allowed: true };
    }

    // Reset window if expired
    if (now - entry.firstAttempt > config.windowMs) {
        rateLimitStore.set(action, { count: 1, firstAttempt: now, lastAttempt: now });
        return { allowed: true };
    }

    // Check cooldown between attempts
    if (now - entry.lastAttempt < 1000) {
        // Less than 1 second between attempts → definitely a bot
        return { allowed: false, retryAfterSeconds: Math.ceil(config.cooldownMs / 1000) };
    }

    // Check max attempts
    if (entry.count >= config.maxAttempts) {
        const retryAfter = Math.ceil((config.cooldownMs - (now - entry.lastAttempt)) / 1000);
        if (retryAfter > 0) {
            return { allowed: false, retryAfterSeconds: retryAfter };
        }
        // Cooldown passed, reset
        rateLimitStore.set(action, { count: 1, firstAttempt: now, lastAttempt: now });
        return { allowed: true };
    }

    // Increment
    entry.count++;
    entry.lastAttempt = now;
    return { allowed: true };
}

// ─── Turnstile / CAPTCHA ─────────────────────────────────────────────────────

/**
 * To enable Cloudflare Turnstile CAPTCHA:
 * 
 * 1. Go to https://dash.cloudflare.com → Turnstile → Add Site
 * 2. Choose "Managed" mode (invisible to users in most cases)
 * 3. Add your domain (e.g., safetransfer.it)
 * 4. Copy the Site Key here below
 * 5. Copy the Secret Key to Supabase Dashboard → Auth → Bot & Abuse Protection
 * 
 * Also enable CAPTCHA in Supabase Dashboard:
 * → Authentication → Bot and Abuse Protection → Enable CAPTCHA protection
 * → Select "Turnstile" → Paste the Secret Key → Save
 */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export function isTurnstileEnabled(): boolean {
    return TURNSTILE_SITE_KEY.length > 0;
}

// ─── Combined Validation ─────────────────────────────────────────────────────

export interface AntiBotResult {
    passed: boolean;
    reason?: string;
}

export function validateAntiBot(params: {
    honeypotValue: string;
    formStartTime: number;
    isSignUp: boolean;
    action: string;
    captchaToken?: string;
}): AntiBotResult {
    // 1. Honeypot check
    if (isHoneypotTriggered(params.honeypotValue)) {
        console.warn('🚫 Bot detected: honeypot triggered');
        // Return a generic error (don't reveal detection method to bots)
        return { passed: false, reason: 'Request could not be processed. Please try again.' };
    }

    // 2. Time-based check
    if (isFormFilledTooFast(params.formStartTime, params.isSignUp)) {
        console.warn('🚫 Bot detected: form filled too fast');
        return { passed: false, reason: 'Please take a moment before submitting.' };
    }

    // 3. Client-side rate limit
    const rateCheck = checkClientRateLimit(params.action);
    if (!rateCheck.allowed) {
        console.warn('🚫 Rate limit exceeded');
        return {
            passed: false,
            reason: `Too many attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`
        };
    }

    // 4. Turnstile check (if enabled and no token provided)
    if (isTurnstileEnabled() && !params.captchaToken) {
        return { passed: false, reason: 'Please complete the security verification.' };
    }

    return { passed: true };
}
