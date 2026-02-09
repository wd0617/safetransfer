import { useState } from 'react';
import { Key, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { createSecurityAlert } from '../../lib/security';
import { getSecurityContext } from '../../lib/security';

export function PasswordResetAssistance() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    setLoading(true);

    try {
      const { data: businessUserData } = await supabase
        .from('business_users')
        .select('user_id, business_id, full_name')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (!businessUserData) {
        setMessage({ type: 'error', text: 'Usuario no está asociado a ningún negocio activo' });
        setLoading(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setMessage({ type: 'error', text: `Error al solicitar recuperación: ${resetError.message}` });
        setLoading(false);
        return;
      }

      await supabase
        .from('business_users')
        .update({
          must_change_password: true,
        })
        .eq('user_id', businessUserData.user_id);

      const context = getSecurityContext();
      await supabase
        .from('password_change_requests')
        .insert({
          user_id: businessUserData.user_id,
          business_id: businessUserData.business_id,
          email: email,
          status: 'approved',
          request_token: crypto.randomUUID(),
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
        });

      await createSecurityAlert({
        alert_type: 'privilege_escalation',
        severity: 'high',
        user_id: user?.id,
        business_id: businessUserData.business_id,
        description: `SuperAdmin solicitó restablecimiento de contraseña para ${email}`,
        metadata: {
          target_user_email: email,
          target_user_id: businessUserData.user_id,
          superadmin_id: user?.id,
        },
      });

      setMessage({
        type: 'success',
        text: `Solicitud de recuperación enviada para ${email}. El usuario recibirá un enlace de restablecimiento.`,
      });

      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage({ type: 'error', text: 'Error al procesar la solicitud' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Key className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Asistencia de Recuperación de Contraseña</h2>
          <p className="text-sm text-slate-600">Ayuda a los negocios a recuperar el acceso a sus cuentas</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Importante: Acción de Alto Privilegio</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Esta acción quedará registrada en el log de auditoría</li>
              <li>Se generará una alerta de seguridad</li>
              <li>Solo usar cuando el negocio lo solicite directamente</li>
              <li>Verificar la identidad del negocio antes de proceder</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email del Usuario
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="usuario@ejemplo.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Nueva Contraseña
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Mínimo 8 caracteres"
            required
            disabled={loading}
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Confirmar Nueva Contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Repetir contraseña"
            required
            disabled={loading}
            minLength={8}
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Key className="w-5 h-5" />
              Restablecer Contraseña
            </>
          )}
        </button>
      </form>
    </div>
  );
}
