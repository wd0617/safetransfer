import { useState, useEffect, useRef } from 'react';
import { LogIn, Mail, ArrowLeft, Building2, User, MapPin, FileText, ChevronRight, ChevronLeft, Shield } from 'lucide-react';
import { useTranslation, Language } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { validateAntiBot, createFormTimer, isTurnstileEnabled, TURNSTILE_SITE_KEY } from '../../lib/antiBot';
import { Turnstile } from '@marsidev/react-turnstile';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string, businessName: string, extraData?: Record<string, string>) => Promise<void>;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToLanding?: () => void;
}

// Hardcoded texts mapped by language for the registration form
const formTexts: Record<string, Record<string, string>> = {
  it: {
    // Validations
    'val.fullName': 'Inserisci il tuo nome completo',
    'val.email': 'Inserisci la tua email',
    'val.emailInvalid': 'Email non valida',
    'val.passwordMin': 'La password deve avere almeno 8 caratteri',
    'val.passwordMatch': 'Le password non corrispondono',
    'val.businessName': 'Inserisci il nome dell\'attività',
    'val.phone': 'Inserisci il numero di telefono',
    'val.partitaIva': 'Inserisci la Partita IVA',
    'val.businessType': 'Seleziona il tipo di attività',
    'val.city': 'Inserisci la città',
    'val.acceptTerms': 'Devi accettare i termini e le condizioni',
    // Steps
    'step.account': 'Account',
    'step.business': 'Attività',
    'step.location': 'Sede',
    // Step 1
    'step1.title': 'Dati dell\'account',
    'step1.subtitle': 'Informazioni di accesso e contatto principale',
    'step1.fullName': 'Nome completo del responsabile *',
    'step1.fullNamePlaceholder': 'Es: Mario Rossi',
    'step1.email': 'Email *',
    'step1.password': 'Password *',
    'step1.passwordPlaceholder': 'Minimo 8 caratteri',
    'step1.confirmPassword': 'Conferma password *',
    'step1.confirmPasswordPlaceholder': 'Ripeti la password',
    // Step 2
    'step2.title': 'Dati dell\'attività',
    'step2.subtitle': 'Informazioni legali e fiscali dell\'attività',
    'step2.businessName': 'Nome attività / Ragione sociale *',
    'step2.businessNamePlaceholder': 'Es: Money Transfer SRL',
    'step2.businessType': 'Tipo di attività *',
    'step2.businessTypeSelect': 'Seleziona tipo...',
    'step2.businessType.moneyTransfer': 'Money Transfer / Invio denaro',
    'step2.businessType.exchange': 'Cambio valuta',
    'step2.businessType.financial': 'Servizi finanziari',
    'step2.businessType.callCenter': 'Call Center / Punto telefonico',
    'step2.businessType.multiservices': 'Multiservizi',
    'step2.businessType.other': 'Altro',
    'step2.partitaIva': 'Partita IVA *',
    'step2.partitaIvaPlaceholder': 'Es: IT12345678901',
    'step2.codiceFiscale': 'Codice Fiscale',
    'step2.codiceFiscalePlaceholder': 'Es: RSSMRA80A01H501U',
    'step2.phone': 'Telefono *',
    'step2.phonePlaceholder': 'Es: +39 333 1234567',
    'step2.pec': 'PEC (email certificata)',
    'step2.pecPlaceholder': 'attivita@pec.it',
    'step2.website': 'Sito web',
    'step2.websitePlaceholder': 'https://www.tuaattivita.com',
    // Step 3
    'step3.title': 'Sede e conferma',
    'step3.subtitle': 'Indirizzo dell\'attività e accettazione dei termini',
    'step3.address': 'Indirizzo',
    'step3.addressPlaceholder': 'Es: Via Roma 123',
    'step3.city': 'Città *',
    'step3.cityPlaceholder': 'Es: Milano',
    'step3.cap': 'CAP',
    'step3.capPlaceholder': 'Es: 20100',
    'step3.country': 'Paese',
    'step3.summary': 'Riepilogo della richiesta',
    'step3.summaryContact': 'Responsabile:',
    'step3.summaryEmail': 'Email:',
    'step3.summaryBusiness': 'Attività:',
    'step3.summaryPiva': 'P.IVA:',
    'step3.summaryPhone': 'Telefono:',
    'step3.summaryCity': 'Città:',
    'step3.terms': 'Accetto i',
    'step3.termsLink': 'termini e condizioni',
    'step3.privacyLink': 'informativa sulla privacy',
    'step3.termsGdpr': 'del servizio, l\'informativa sulla privacy e autorizzo il trattamento dei miei dati personali ai sensi del GDPR. Comprendo che la mia richiesta sarà esaminata prima dell\'attivazione dell\'account.',
    // Navigation
    'nav.previous': 'Indietro',
    'nav.next': 'Avanti',
    'nav.submit': '🚀 Invia richiesta di registrazione',
    'nav.submitting': 'Registrazione in corso...',
    'nav.back': 'Indietro',
    'nav.businessRegistration': 'Registrazione attività',
    'nav.securityNote': '🔒 Le tue informazioni sono protette con crittografia end-to-end',
    // Forgot password
    'forgot.title': 'Password dimenticata?',
    'forgot.desc': 'Inserisci la tua email e ti invieremo un link per reimpostare la password.',
    'forgot.send': 'Invia link di recupero',
    'forgot.sent': 'Email di recupero inviata! Controlla la tua casella di posta e segui le istruzioni.',
    'forgot.back': 'Torna al login',
    'forgot.enterEmail': 'Inserisci il tuo indirizzo email',
  },
  es: {
    'val.fullName': 'Ingresa tu nombre completo',
    'val.email': 'Ingresa tu email',
    'val.emailInvalid': 'Email no válido',
    'val.passwordMin': 'La contraseña debe tener mínimo 8 caracteres',
    'val.passwordMatch': 'Las contraseñas no coinciden',
    'val.businessName': 'Ingresa el nombre del negocio',
    'val.phone': 'Ingresa el número de teléfono',
    'val.partitaIva': 'Ingresa la Partita IVA',
    'val.businessType': 'Selecciona el tipo de negocio',
    'val.city': 'Ingresa la ciudad',
    'val.acceptTerms': 'Debes aceptar los términos y condiciones',
    'step.account': 'Cuenta',
    'step.business': 'Negocio',
    'step.location': 'Ubicación',
    'step1.title': 'Datos de la cuenta',
    'step1.subtitle': 'Información de acceso y contacto principal',
    'step1.fullName': 'Nombre completo del responsable *',
    'step1.fullNamePlaceholder': 'Ej: Mario Rossi',
    'step1.email': 'Email *',
    'step1.password': 'Contraseña *',
    'step1.passwordPlaceholder': 'Mínimo 8 caracteres',
    'step1.confirmPassword': 'Confirmar contraseña *',
    'step1.confirmPasswordPlaceholder': 'Repetir contraseña',
    'step2.title': 'Datos del negocio',
    'step2.subtitle': 'Información legal y fiscal del negocio',
    'step2.businessName': 'Nombre del negocio / Razón social *',
    'step2.businessNamePlaceholder': 'Ej: Money Transfer SRL',
    'step2.businessType': 'Tipo de negocio *',
    'step2.businessTypeSelect': 'Seleccionar tipo...',
    'step2.businessType.moneyTransfer': 'Money Transfer / Envío de dinero',
    'step2.businessType.exchange': 'Casa de cambio',
    'step2.businessType.financial': 'Servicios financieros',
    'step2.businessType.callCenter': 'Call Center / Locutorio',
    'step2.businessType.multiservices': 'Multiservizi',
    'step2.businessType.other': 'Otro',
    'step2.partitaIva': 'Partita IVA *',
    'step2.partitaIvaPlaceholder': 'Ej: IT12345678901',
    'step2.codiceFiscale': 'Codice Fiscale',
    'step2.codiceFiscalePlaceholder': 'Ej: RSSMRA80A01H501U',
    'step2.phone': 'Teléfono *',
    'step2.phonePlaceholder': 'Ej: +39 333 1234567',
    'step2.pec': 'PEC (email certificada)',
    'step2.pecPlaceholder': 'negocio@pec.it',
    'step2.website': 'Sitio web',
    'step2.websitePlaceholder': 'https://www.tunegocio.com',
    'step3.title': 'Ubicación y confirmación',
    'step3.subtitle': 'Dirección del negocio y aceptación de términos',
    'step3.address': 'Dirección',
    'step3.addressPlaceholder': 'Ej: Via Roma 123',
    'step3.city': 'Ciudad *',
    'step3.cityPlaceholder': 'Ej: Milano',
    'step3.cap': 'CAP',
    'step3.capPlaceholder': 'Ej: 20100',
    'step3.country': 'País',
    'step3.summary': 'Resumen de la solicitud',
    'step3.summaryContact': 'Responsable:',
    'step3.summaryEmail': 'Email:',
    'step3.summaryBusiness': 'Negocio:',
    'step3.summaryPiva': 'P.IVA:',
    'step3.summaryPhone': 'Teléfono:',
    'step3.summaryCity': 'Ciudad:',
    'step3.terms': 'Acepto los',
    'step3.termsLink': 'términos y condiciones',
    'step3.privacyLink': 'política de privacidad',
    'step3.termsGdpr': 'del servicio, la política de privacidad y autorizo el tratamiento de mis datos personales conforme al GDPR. Entiendo que mi solicitud será revisada antes de activar la cuenta.',
    'nav.previous': 'Anterior',
    'nav.next': 'Siguiente',
    'nav.submit': '🚀 Enviar solicitud de registro',
    'nav.submitting': 'Registrando...',
    'nav.back': 'Volver',
    'nav.businessRegistration': 'Registro de negocio',
    'nav.securityNote': '🔒 Tu información está protegida con encriptación de extremo a extremo',
    'forgot.title': '¿Olvidaste tu contraseña?',
    'forgot.desc': 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.',
    'forgot.send': 'Enviar enlace de recuperación',
    'forgot.sent': '¡Email de recuperación enviado! Revisa tu bandeja de entrada y sigue las instrucciones.',
    'forgot.back': 'Volver al inicio de sesión',
    'forgot.enterEmail': 'Ingresa tu dirección de email',
  },
  en: {
    'val.fullName': 'Enter your full name',
    'val.email': 'Enter your email',
    'val.emailInvalid': 'Invalid email',
    'val.passwordMin': 'Password must be at least 8 characters',
    'val.passwordMatch': 'Passwords do not match',
    'val.businessName': 'Enter the business name',
    'val.phone': 'Enter the phone number',
    'val.partitaIva': 'Enter the Partita IVA',
    'val.businessType': 'Select a business type',
    'val.city': 'Enter the city',
    'val.acceptTerms': 'You must accept the terms and conditions',
    'step.account': 'Account',
    'step.business': 'Business',
    'step.location': 'Location',
    'step1.title': 'Account Details',
    'step1.subtitle': 'Login and main contact information',
    'step1.fullName': 'Full name of the responsible person *',
    'step1.fullNamePlaceholder': 'E.g.: Mario Rossi',
    'step1.email': 'Email *',
    'step1.password': 'Password *',
    'step1.passwordPlaceholder': 'Minimum 8 characters',
    'step1.confirmPassword': 'Confirm password *',
    'step1.confirmPasswordPlaceholder': 'Repeat password',
    'step2.title': 'Business Details',
    'step2.subtitle': 'Legal and fiscal information of the business',
    'step2.businessName': 'Business name / Legal name *',
    'step2.businessNamePlaceholder': 'E.g.: Money Transfer SRL',
    'step2.businessType': 'Business type *',
    'step2.businessTypeSelect': 'Select type...',
    'step2.businessType.moneyTransfer': 'Money Transfer',
    'step2.businessType.exchange': 'Currency Exchange',
    'step2.businessType.financial': 'Financial Services',
    'step2.businessType.callCenter': 'Call Center',
    'step2.businessType.multiservices': 'Multi-services',
    'step2.businessType.other': 'Other',
    'step2.partitaIva': 'VAT Number (Partita IVA) *',
    'step2.partitaIvaPlaceholder': 'E.g.: IT12345678901',
    'step2.codiceFiscale': 'Tax Code (Codice Fiscale)',
    'step2.codiceFiscalePlaceholder': 'E.g.: RSSMRA80A01H501U',
    'step2.phone': 'Phone *',
    'step2.phonePlaceholder': 'E.g.: +39 333 1234567',
    'step2.pec': 'PEC (certified email)',
    'step2.pecPlaceholder': 'business@pec.it',
    'step2.website': 'Website',
    'step2.websitePlaceholder': 'https://www.yourbusiness.com',
    'step3.title': 'Location & Confirmation',
    'step3.subtitle': 'Business address and terms acceptance',
    'step3.address': 'Address',
    'step3.addressPlaceholder': 'E.g.: Via Roma 123',
    'step3.city': 'City *',
    'step3.cityPlaceholder': 'E.g.: Milan',
    'step3.cap': 'Postal Code',
    'step3.capPlaceholder': 'E.g.: 20100',
    'step3.country': 'Country',
    'step3.summary': 'Application Summary',
    'step3.summaryContact': 'Contact:',
    'step3.summaryEmail': 'Email:',
    'step3.summaryBusiness': 'Business:',
    'step3.summaryPiva': 'VAT:',
    'step3.summaryPhone': 'Phone:',
    'step3.summaryCity': 'City:',
    'step3.terms': 'I accept the',
    'step3.termsLink': 'terms and conditions',
    'step3.privacyLink': 'privacy policy',
    'step3.termsGdpr': 'and the privacy policy. I authorize the processing of my personal data in accordance with the GDPR. I understand that my application will be reviewed before the account is activated.',
    'nav.previous': 'Previous',
    'nav.next': 'Next',
    'nav.submit': '🚀 Submit registration request',
    'nav.submitting': 'Registering...',
    'nav.back': 'Back',
    'nav.businessRegistration': 'Business Registration',
    'nav.securityNote': '🔒 Your information is protected with end-to-end encryption',
    'forgot.title': 'Forgot your password?',
    'forgot.desc': 'Enter your email and we\'ll send you a link to reset your password.',
    'forgot.send': 'Send recovery link',
    'forgot.sent': 'Recovery email sent! Check your inbox and follow the instructions.',
    'forgot.back': 'Back to login',
    'forgot.enterEmail': 'Enter your email address',
  },
};

// Helper to get translated form text
function ft(lang: Language, key: string): string {
  return formTexts[lang]?.[key] || formTexts['it'][key] || key;
}

export function AuthForm({ onSignIn, onSignUp, language, onLanguageChange, onBackToLanding }: AuthFormProps) {
  const { t } = useTranslation(language);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [signupStep, setSignupStep] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [pecEmail, setPecEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('IT');
  const [businessType, setBusinessType] = useState('');
  const [website, setWebsite] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Anti-bot protection
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const formTimerRef = useRef<number>(createFormTimer());
  const turnstileRef = useRef<any>(null);

  // Reset timer when switching between login/signup
  useEffect(() => {
    formTimerRef.current = createFormTimer();
    setCaptchaToken(undefined);
  }, [isSignUp]);

  const totalSteps = 3;

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!fullName.trim()) return ft(language, 'val.fullName');
        if (!email.trim()) return ft(language, 'val.email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ft(language, 'val.emailInvalid');
        if (!password || password.length < 8) return ft(language, 'val.passwordMin');
        if (password !== confirmPassword) return ft(language, 'val.passwordMatch');
        return null;
      case 2:
        if (!businessName.trim()) return ft(language, 'val.businessName');
        if (!phone.trim()) return ft(language, 'val.phone');
        if (!partitaIva.trim()) return ft(language, 'val.partitaIva');
        if (!businessType) return ft(language, 'val.businessType');
        return null;
      case 3:
        if (!city.trim()) return ft(language, 'val.city');
        if (!acceptTerms) return ft(language, 'val.acceptTerms');
        return null;
      default:
        return null;
    }
  };

  const handleNextStep = () => {
    const validationError = validateStep(signupStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSignupStep(Math.min(signupStep + 1, totalSteps));
  };

  const handlePrevStep = () => {
    setError('');
    setSignupStep(Math.max(signupStep - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Anti-bot validation
    const antiBotCheck = validateAntiBot({
      honeypotValue: honeypot,
      formStartTime: formTimerRef.current,
      isSignUp,
      action: isSignUp ? 'signup' : 'login',
      captchaToken,
    });

    if (!antiBotCheck.passed) {
      // For bots, silently fail or show generic error
      setError(antiBotCheck.reason || 'An error occurred. Please try again.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const validationError = validateStep(signupStep);
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }
        await onSignUp(email, password, fullName, businessName, {
          phone,
          partitaIva,
          codiceFiscale,
          pecEmail,
          address,
          city,
          postalCode,
          country,
          businessType,
          website,
          language,
          ...(captchaToken ? { captchaToken } : {}),
        });
      } else {
        await onSignIn(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      // Reset captcha for next attempt
      setCaptchaToken(undefined);
      turnstileRef.current?.reset();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Anti-bot rate limit for password resets
    const antiBotCheck = validateAntiBot({
      honeypotValue: honeypot,
      formStartTime: formTimerRef.current,
      isSignUp: false,
      action: 'forgot',
    });

    if (!antiBotCheck.passed) {
      setError(antiBotCheck.reason || 'An error occurred. Please try again.');
      return;
    }

    setLoading(true);

    try {
      if (!email) {
        throw new Error(ft(language, 'forgot.enterEmail'));
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMessage(ft(language, 'forgot.sent'));
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  // ==================== FORGOT PASSWORD ====================
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="absolute top-4 right-4">
          <select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="it">🇮🇹 Italiano</option>
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 हिन्दी</option>
            <option value="ur">🇵🇰 اردو</option>
          </select>
        </div>
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-amber-500 p-3 rounded-xl"><Mail className="w-8 h-8 text-white" /></div>
            </div>
            <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
              {ft(language, 'forgot.title')}
            </h1>
            <p className="text-center text-slate-600 mb-8">
              {ft(language, 'forgot.desc')}
            </p>
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            {successMessage && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMessage}</div>}
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className={labelClass}>{t('auth.email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" className={inputClass} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
                {loading ? t('common.loading') : ft(language, 'forgot.send')}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => { setShowForgotPassword(false); setError(''); setSuccessMessage(''); }}
                className="text-slate-600 hover:text-slate-800 text-sm font-medium inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />{ft(language, 'forgot.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SIGNUP FORM (Multi-step) ====================
  if (isSignUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        {onBackToLanding && (
          <button onClick={onBackToLanding}
            className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />{ft(language, 'nav.back')}
          </button>
        )}
        <div className="absolute top-4 right-4">
          <select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="px-4 py-2 border border-slate-600 rounded-lg bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="it">🇮🇹 Italiano</option>
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 हिन्दी</option>
            <option value="ur">🇵🇰 اردو</option>
          </select>
        </div>

        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">SafeTransfer</h1>
            </div>
            <p className="text-blue-200">{ft(language, 'nav.businessRegistration')}</p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1">
                <div className={`h-2 rounded-full transition-all ${step <= signupStep ? 'bg-blue-500' : 'bg-slate-700'
                  }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mb-6 px-1">
            <span className={signupStep >= 1 ? 'text-blue-400' : ''}>1. {ft(language, 'step.account')}</span>
            <span className={signupStep >= 2 ? 'text-blue-400' : ''}>2. {ft(language, 'step.business')}</span>
            <span className={signupStep >= 3 ? 'text-blue-400' : ''}>3. {ft(language, 'step.location')}</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Honeypot - invisible to real users, bots auto-fill it */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="website_url">Website URL</label>
                <input
                  type="text"
                  id="website_url"
                  name="website_url"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              {/* ===== STEP 1: Account ===== */}
              {signupStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg"><User className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{ft(language, 'step1.title')}</h2>
                      <p className="text-xs text-slate-500">{ft(language, 'step1.subtitle')}</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{ft(language, 'step1.fullName')}</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder={ft(language, 'step1.fullNamePlaceholder')} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{ft(language, 'step1.email')}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com" required className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{ft(language, 'step1.password')}</label>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={ft(language, 'step1.passwordPlaceholder')} required minLength={8} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{ft(language, 'step1.confirmPassword')}</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={ft(language, 'step1.confirmPasswordPlaceholder')} required minLength={8} className={inputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Business ===== */}
              {signupStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-100 p-2 rounded-lg"><Building2 className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{ft(language, 'step2.title')}</h2>
                      <p className="text-xs text-slate-500">{ft(language, 'step2.subtitle')}</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{ft(language, 'step2.businessName')}</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={ft(language, 'step2.businessNamePlaceholder')} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{ft(language, 'step2.businessType')}</label>
                    <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}
                      required className={inputClass}>
                      <option value="">{ft(language, 'step2.businessTypeSelect')}</option>
                      <option value="money_transfer">{ft(language, 'step2.businessType.moneyTransfer')}</option>
                      <option value="exchange">{ft(language, 'step2.businessType.exchange')}</option>
                      <option value="financial_services">{ft(language, 'step2.businessType.financial')}</option>
                      <option value="call_center">{ft(language, 'step2.businessType.callCenter')}</option>
                      <option value="multiservices">{ft(language, 'step2.businessType.multiservices')}</option>
                      <option value="other">{ft(language, 'step2.businessType.other')}</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{ft(language, 'step2.partitaIva')}</label>
                      <input type="text" value={partitaIva} onChange={(e) => setPartitaIva(e.target.value)}
                        placeholder={ft(language, 'step2.partitaIvaPlaceholder')} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{ft(language, 'step2.codiceFiscale')}</label>
                      <input type="text" value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value)}
                        placeholder={ft(language, 'step2.codiceFiscalePlaceholder')} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{ft(language, 'step2.phone')}</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder={ft(language, 'step2.phonePlaceholder')} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{ft(language, 'step2.pec')}</label>
                      <input type="email" value={pecEmail} onChange={(e) => setPecEmail(e.target.value)}
                        placeholder={ft(language, 'step2.pecPlaceholder')} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{ft(language, 'step2.website')}</label>
                    <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                      placeholder={ft(language, 'step2.websitePlaceholder')} className={inputClass} />
                  </div>
                </div>
              )}

              {/* ===== STEP 3: Location ===== */}
              {signupStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-amber-100 p-2 rounded-lg"><MapPin className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{ft(language, 'step3.title')}</h2>
                      <p className="text-xs text-slate-500">{ft(language, 'step3.subtitle')}</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{ft(language, 'step3.address')}</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                      placeholder={ft(language, 'step3.addressPlaceholder')} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className={labelClass}>{ft(language, 'step3.city')}</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                        placeholder={ft(language, 'step3.cityPlaceholder')} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{ft(language, 'step3.cap')}</label>
                      <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                        placeholder={ft(language, 'step3.capPlaceholder')} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{ft(language, 'step3.country')}</label>
                      <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                        <option value="IT">🇮🇹 Italia</option>
                        <option value="ES">🇪🇸 España</option>
                        <option value="DE">🇩🇪 Germania</option>
                        <option value="FR">🇫🇷 Francia</option>
                        <option value="UK">🇬🇧 Regno Unito</option>
                        <option value="US">🇺🇸 USA</option>
                        <option value="OTHER">Altro</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />{ft(language, 'step3.summary')}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">{ft(language, 'step3.summaryContact')}</span> <span className="text-slate-800 font-medium">{fullName}</span></div>
                      <div><span className="text-slate-500">{ft(language, 'step3.summaryEmail')}</span> <span className="text-slate-800 font-medium">{email}</span></div>
                      <div><span className="text-slate-500">{ft(language, 'step3.summaryBusiness')}</span> <span className="text-slate-800 font-medium">{businessName}</span></div>
                      <div><span className="text-slate-500">{ft(language, 'step3.summaryPiva')}</span> <span className="text-slate-800 font-medium">{partitaIva}</span></div>
                      <div><span className="text-slate-500">{ft(language, 'step3.summaryPhone')}</span> <span className="text-slate-800 font-medium">{phone}</span></div>
                      <div><span className="text-slate-500">{ft(language, 'step3.summaryCity')}</span> <span className="text-slate-800 font-medium">{city}, {country}</span></div>
                    </div>
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer mt-4">
                    <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      {ft(language, 'step3.terms')} <a href="#" className="text-blue-600 underline">{ft(language, 'step3.termsLink')}</a>{' '}
                      {ft(language, 'step3.termsGdpr')}
                    </span>
                  </label>

                  {/* Turnstile CAPTCHA (only shows when configured) */}
                  {isTurnstileEnabled() && (
                    <div className="flex justify-center mt-4">
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setCaptchaToken(token)}
                        onExpire={() => setCaptchaToken(undefined)}
                        options={{ theme: 'light', size: 'normal' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-8">
                {signupStep > 1 && (
                  <button type="button" onClick={handlePrevStep}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" />{ft(language, 'nav.previous')}
                  </button>
                )}
                {signupStep < totalSteps ? (
                  <button type="button" onClick={handleNextStep}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {ft(language, 'nav.next')}<ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading || !acceptTerms || (isTurnstileEnabled() && !captchaToken)}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? ft(language, 'nav.submitting') : ft(language, 'nav.submit')}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => { setIsSignUp(false); setSignupStep(1); setError(''); }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                {t('auth.alreadyHaveAccount')} {t('auth.signIn')}
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            {ft(language, 'nav.securityNote')}
          </p>
        </div>
      </div>
    );
  }

  // ==================== LOGIN FORM ====================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      {onBackToLanding && (
        <button onClick={onBackToLanding}
          className="absolute top-4 left-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/80 transition-all">
          <ArrowLeft className="w-4 h-4" />{ft(language, 'nav.back')}
        </button>
      )}
      <div className="absolute top-4 right-4">
        <select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="it">🇮🇹 Italiano</option>
          <option value="es">🇪🇸 Español</option>
          <option value="en">🇬🇧 English</option>
          <option value="hi">🇮🇳 हिन्दी</option>
          <option value="ur">🇵🇰 اردو</option>
        </select>
      </div>
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-blue-600 p-3 rounded-xl"><LogIn className="w-8 h-8 text-white" /></div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">SafeTransfer</h1>
          <p className="text-center text-slate-600 mb-8">{t('auth.login')}</p>

          {error && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${error.includes('🔒')
              ? 'bg-red-100 border-2 border-red-300 text-red-800'
              : error.includes('⚠️')
                ? 'bg-amber-50 border border-amber-300 text-amber-800'
                : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
              {error.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {line.includes('support@safetransfer.it')
                    ? <>
                      {line.split('support@safetransfer.it')[0]}
                      <a href="mailto:support@safetransfer.it" className="font-bold underline hover:text-red-900">
                        support@safetransfer.it
                      </a>
                    </>
                    : line
                  }
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot - invisible to real users, bots auto-fill it */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="company_website">Company Website</label>
              <input
                type="text"
                id="company_website"
                name="company_website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass}>{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('auth.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} />
            </div>
            {isTurnstileEnabled() && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(undefined)}
                  options={{ theme: 'light', size: 'normal' }}
                />
              </div>
            )}
            <button type="submit" disabled={loading || (isTurnstileEnabled() && !captchaToken)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t('common.loading') : t('auth.signIn')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { setShowForgotPassword(true); setError(''); }}
              className="text-amber-600 hover:text-amber-700 text-sm font-medium">
              {t('auth.forgotPassword')}
            </button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => { setIsSignUp(true); setError(''); }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              {t('auth.dontHaveAccount')} {t('auth.register')}
            </button>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-slate-600">{t('legal.transferLimit')}</p>
      </div>
    </div>
  );
}
