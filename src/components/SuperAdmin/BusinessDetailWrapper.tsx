import { Component, ReactNode } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { BusinessDetail } from './BusinessDetail';

interface Props {
  businessId: string;
  onBack: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends Component<{ children: ReactNode; onBack: () => void; businessId: string }, State> {
  constructor(props: { children: ReactNode; onBack: () => void; businessId: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('=== [ErrorBoundary] Caught error in BusinessDetail:', error);
    console.error('=== [ErrorBoundary] Error info:', errorInfo);
    console.error('=== [ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={this.props.onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Error Crítico</h2>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Error al Renderizar Detalles del Negocio
                </h3>
                <p className="text-red-800 mb-4">
                  Ocurrió un error inesperado al intentar mostrar los detalles de este negocio.
                  El componente no pudo renderizarse correctamente.
                </p>

                <div className="bg-white border border-red-200 rounded p-4 mb-4">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Detalles del Error:</p>
                  <p className="text-xs font-mono text-red-700 mb-2">
                    {this.state.error?.message || 'Error desconocido'}
                  </p>
                  <p className="text-xs text-slate-600 mb-1">
                    <strong>Business ID:</strong> {this.props.businessId}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Tipo:</strong> {this.state.error?.name || 'Error'}
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                  <p className="text-sm font-medium text-amber-900 mb-1">Posibles Causas:</p>
                  <ul className="text-xs text-amber-800 list-disc list-inside space-y-1">
                    <li>Datos corruptos o inesperados en la base de datos</li>
                    <li>Error en las políticas RLS de Supabase</li>
                    <li>Problema con los tipos de datos TypeScript</li>
                    <li>Permisos insuficientes para acceder a los datos</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      this.setState({ hasError: false, error: null, errorInfo: null });
                      window.location.reload();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Recargar Página
                  </button>
                  <button
                    onClick={this.props.onBack}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Volver a la Lista
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-red-200">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-700 font-medium hover:text-slate-900">
                      Ver Stack Trace Completo (Para Desarrolladores)
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-900 text-green-400 rounded overflow-auto max-h-60 text-xs">
                      {this.state.error?.stack || 'No stack trace available'}
                      {'\n\n'}
                      {this.state.errorInfo?.componentStack || 'No component stack available'}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Nota para el SuperAdmin:</strong> Este error ha sido registrado en la consola del navegador.
              Por favor, abre las herramientas de desarrollo (F12) y revisa la pestaña Console para más información.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function BusinessDetailWrapper({ businessId, onBack }: Props) {
  console.log('=== [BusinessDetailWrapper] Rendering with businessId:', businessId);
  console.log('=== [BusinessDetailWrapper] businessId type:', typeof businessId);
  console.log('=== [BusinessDetailWrapper] businessId truthy:', !!businessId);

  if (!businessId) {
    console.error('=== [BusinessDetailWrapper] ERROR: businessId is null, undefined, or empty!');
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Error de Configuración</h2>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                ID de Negocio No Proporcionado
              </h3>
              <p className="text-amber-800 mb-4">
                No se proporcionó un ID de negocio válido para mostrar los detalles.
                Esto es un error de programación, no un problema de datos.
              </p>

              <div className="bg-white border border-amber-200 rounded p-4 mb-4">
                <p className="text-sm font-semibold text-slate-900 mb-2">Información de Depuración:</p>
                <p className="text-xs text-slate-600">
                  <strong>businessId:</strong> {String(businessId)} (tipo: {typeof businessId})
                </p>
              </div>

              <button
                onClick={onBack}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Volver a la Lista de Negocios
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary businessId={businessId} onBack={onBack}>
      <BusinessDetail businessId={businessId} onBack={onBack} />
    </ErrorBoundary>
  );
}
