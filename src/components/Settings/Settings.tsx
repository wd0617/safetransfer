import { useState } from 'react';
import { Save, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation, Language } from '../../lib/i18n';
import { Card, Input, Button, Badge } from '../ui';
import { toast } from '../../contexts/ToastContext';

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
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [businessData, setBusinessData] = useState({
    name: business.name,
    email: business.email,
    registration_number: business.registration_number || '',
    primary_color: business.primary_color || '#3b82f6',
    secondary_color: business.secondary_color || '#10b981',
  });

  const [userData, setUserData] = useState({
    full_name: businessUser.full_name,
    language: businessUser.language || language,
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSaveBusiness = async () => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(businessData)
        .eq('id', business.id);

      if (updateError) throw updateError;

      toast.success(t('settings.businessSaved') || 'Configuración guardada');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el negocio');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('business_users')
        .update(userData)
        .eq('id', businessUser.id);

      if (updateError) throw updateError;

      onLanguageChange(userData.language as Language);
      toast.success(t('settings.profileSaved') || 'Perfil actualizado');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordLoading(true);
    try {
      if (!passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error(
          language === 'it'
            ? 'Compila entrambi i campi'
            : language === 'es'
              ? 'Por favor complete ambos campos'
              : 'Please fill in both fields'
        );
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error(
          language === 'it'
            ? 'La password deve avere almeno 6 caratteri'
            : language === 'es'
              ? 'La contraseña debe tener al menos 6 caracteres'
              : 'Password must be at least 6 characters'
        );
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(
          language === 'it'
            ? 'Le password non corrispondono'
            : language === 'es'
              ? 'Las contraseñas no coinciden'
              : 'Passwords do not match'
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success(
        language === 'it'
          ? 'Password modificata con successo!'
          : language === 'es'
            ? '¡Contraseña cambiada exitosamente!'
            : 'Password changed successfully!'
      );
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Password change error:', err);
      toast.error(err.message || 'Error al cambiar la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h1>
        <Badge variant="info" size="sm">
          {businessUser.role === 'admin' ? 'Admin' : 'Operatore'}
        </Badge>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{t('settings.profile')}</h2>

        <div className="space-y-4 max-w-xl">
          <Input
            label={t('settings.fullName')}
            value={userData.full_name}
            onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('settings.language')}
            </label>
            <select
              value={userData.language}
              onChange={(e) => setUserData({ ...userData, language: e.target.value as Language })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>

          <Input
            label={t('settings.role')}
            value={t(`settings.${businessUser.role}`)}
            disabled
          />

          <Button
            onClick={handleSaveProfile}
            isLoading={loading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {t('settings.save')}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {language === 'it'
            ? 'Cambia Password'
            : language === 'es'
              ? 'Cambiar Contraseña'
              : 'Change Password'}
        </h2>

        <div className="space-y-4 max-w-xl">
          <Input
            label={
              language === 'it'
                ? 'Nuova Password'
                : language === 'es'
                  ? 'Nueva Contraseña'
                  : 'New Password'
            }
            type={showNewPassword ? 'text' : 'password'}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            placeholder={
              language === 'it'
                ? 'Minimo 6 caratteri'
                : language === 'es'
                  ? 'Mínimo 6 caracteres'
                  : 'Minimum 6 characters'
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
          />

          <Input
            label={
              language === 'it'
                ? 'Conferma Nuova Password'
                : language === 'es'
                  ? 'Confirmar Nueva Contraseña'
                  : 'Confirm New Password'
            }
            type={showConfirmPassword ? 'text' : 'password'}
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            placeholder={
              language === 'it'
                ? 'Ripeti la password'
                : language === 'es'
                  ? 'Repetir contraseña'
                  : 'Repeat password'
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
          />

          <Button
            variant="secondary"
            onClick={handleChangePassword}
            isLoading={passwordLoading}
            disabled={!passwordData.newPassword || !passwordData.confirmPassword}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            {passwordLoading
              ? t('common.loading')
              : language === 'it'
                ? 'Cambia Password'
                : language === 'es'
                  ? 'Cambiar Contraseña'
                  : 'Change Password'}
          </Button>
        </div>
      </Card>

      {businessUser.role === 'admin' && (
        <Card>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{t('settings.business')}</h2>

          <div className="space-y-4 max-w-xl">
            <Input
              label={t('settings.businessName')}
              value={businessData.name}
              onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
            />

            <Input
              label={t('settings.businessEmail')}
              type="email"
              value={businessData.email || ''}
              onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
            />

            <Input
              label={t('settings.registrationNumber')}
              value={businessData.registration_number}
              onChange={(e) => setBusinessData({ ...businessData, registration_number: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('settings.primaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={businessData.primary_color}
                    onChange={(e) => setBusinessData({ ...businessData, primary_color: e.target.value })}
                    className="h-10 w-16 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={businessData.primary_color}
                    onChange={(e) => setBusinessData({ ...businessData, primary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('settings.secondaryColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={businessData.secondary_color}
                    onChange={(e) => setBusinessData({ ...businessData, secondary_color: e.target.value })}
                    className="h-10 w-16 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={businessData.secondary_color}
                    onChange={(e) => setBusinessData({ ...businessData, secondary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveBusiness}
              isLoading={loading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {t('settings.save')}
            </Button>
          </div>
        </Card>
      )}

      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-2xl p-6">
        <h3 className="font-semibold text-brand-900 dark:text-brand-200 mb-2">{t('legal.title')}</h3>
        <div className="space-y-2 text-sm text-brand-800 dark:text-brand-300">
          <p>
            <strong>{t('legal.italianLaw')}:</strong> {t('legal.transferLimit')}
          </p>
          <p>
            <strong>{t('legal.gdprCompliance')}:</strong> {t('legal.dataProtection')}
          </p>
          <p>
            <strong>{t('legal.auditTrail')}:</strong> All actions are logged for compliance
          </p>
        </div>
      </div>
    </div>
  );
}
