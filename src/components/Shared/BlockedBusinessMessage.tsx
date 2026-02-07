import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function BlockedBusinessMessage() {
  const { signOut, business } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-white/20 rounded-full">
                <ShieldAlert className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center">Acceso Bloqueado</h1>
          </div>

          <div className="p-8">
            <div className="space-y-4 text-center">
              <p className="text-lg font-semibold text-slate-900">
                Este negocio está bloqueado o desactivado
              </p>

              {business && (
                <div className="bg-slate-100 rounded-lg p-4 border-l-4 border-red-500">
                  <p className="text-sm font-medium text-slate-700 mb-1">Negocio:</p>
                  <p className="font-bold text-slate-900">{business.name}</p>
                  <p className="text-sm text-slate-600 mt-2">
                    Estado: <span className="font-semibold text-red-600">{business.status}</span>
                  </p>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <p className="text-slate-600">
                  No puedes acceder ni realizar operaciones en este negocio en este momento.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">Importante:</span> Para restaurar el acceso,
                    contacta al administrador del sistema (SuperAdmin).
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full mt-6 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Si crees que esto es un error, contacta al soporte técnico
          </p>
        </div>
      </div>
    </div>
  );
}
