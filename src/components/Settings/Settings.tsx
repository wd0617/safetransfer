import { useState } from 'react';
import { Save, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
type Business = {
  id: string;
  name: string;
  email?: string;
  registration_number?: string | null;
  primary_color?: string;
  secondary_color?: string;
};
type BusinessUser = {
  id: string;
  full_name: string;
  language?: Language;
  role: 'admin' | 'operator';
};

interface SettingsProps {
  business: Business;
  businessUser: BusinessUser;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onRefresh: () => void;
}

export function Settings({ business, businessUser, language, onLanguageChange, onRefresh }: SettingsProps) {
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [businessData, setBusinessData] = useState({
    name: business.name,
    email: business.email,
    registration_number: business.registration_number || '',
    primary_color: business.primary_color,
    secondary_color: business.secondary_color,
  });

  const [userData, setUserData] = useState({
    full_name: businessUser.full_name,
    language: businessUser.language,
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSaveBusiness = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(businessData)
        .eq('id', business.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error updating business');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('business_users')
        .update(userData)
        .eq('id', businessUser.id);

      if (updateError) throw updateError;

      onLanguageChange(userData.language as Language);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      // Validaciones
      if (!passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error(language === 'it' ? 'Compila entrambi i campi' : language === 'es' ? 'Por favor complete ambos campos' : 'Please fill in both fields');
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error(language === 'it' ? 'La password deve avere almeno 6 caratteri' : language === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(language === 'it' ? 'Le password non corrispondono' : language === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      }

      // Cambiar contraseña en Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordError(err.message || 'Error changing password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">{t('settings.title')}</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {t('common.success')}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">{t('settings.profile')}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('settings.fullName')}
            </label>
            <input
              type="text"
              value={userData.full_name}
              onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('settings.language')}
            </label>
            <select
              value={userData.language}
              onChange={(e) => setUserData({ ...userData, language: e.target.value as Language })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('settings.role')}
            </label>
            <input
              type="text"
              value={t(`settings.${businessUser.role}`)}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? t('common.loading') : t('settings.save')}
          </button>
        </div>
      </div>

      {/* Sección de Cambio de Contraseña */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {language === 'it' ? 'Cambia Password' :
            language === 'es' ? 'Cambiar Contraseña' : 'Change Password'}
        </h2>

        {passwordError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {language === 'it' ? 'Password modificata con successo!' :
              language === 'es' ? '¡Contraseña cambiada exitosamente!' : 'Password changed successfully!'}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {language === 'it' ? 'Nuova Password' :
                language === 'es' ? 'Nueva Contraseña' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder={language === 'it' ? 'Minimo 6 caratteri' : language === 'es' ? 'Mínimo 6 caracteres' : 'Minimum 6 characters'}
                className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {language === 'it' ? 'Conferma Nuova Password' :
                language === 'es' ? 'Confirmar Nueva Contraseña' : 'Confirm New Password'}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder={language === 'it' ? 'Ripeti la password' : language === 'es' ? 'Repetir contraseña' : 'Repeat password'}
                className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            {passwordLoading ? t('common.loading') :
              (language === 'it' ? 'Cambia Password' :
                language === 'es' ? 'Cambiar Contraseña' : 'Change Password')}
          </button>
        </div>
      </div>

      {businessUser.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">{t('settings.business')}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('settings.businessName')}
              </label>
              <input
                type="text"
                value={businessData.name}
                onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('settings.businessEmail')}
              </label>
              <input
                type="email"
                value={businessData.email}
                onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('settings.registrationNumber')}
              </label>
              <input
                type="text"
                value={businessData.registration_number}
                onChange={(e) =>
                  setBusinessData({ ...businessData, registration_number: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('settings.primaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={businessData.primary_color}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, primary_color: e.target.value })
                    }
                    className="h-10 w-20 border border-slate-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={businessData.primary_color}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, primary_color: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('settings.secondaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={businessData.secondary_color}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, secondary_color: e.target.value })
                    }
                    className="h-10 w-20 border border-slate-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={businessData.secondary_color}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, secondary_color: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveBusiness}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? t('common.loading') : t('settings.save')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">{t('legal.title')}</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>{t('legal.italianLaw')}:</strong> {t('legal.transferLimit')}</p>
          <p><strong>{t('legal.gdprCompliance')}:</strong> {t('legal.dataProtection')}</p>
          <p><strong>{t('legal.auditTrail')}:</strong> All actions are logged for compliance</p>
        </div>
      </div>
    </div>
  );
}
