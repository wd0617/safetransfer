import { useAuth } from '../../contexts/AuthContext';

export function PendingApproval() {
    const { signOut, business } = useAuth();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                padding: '48px',
                maxWidth: '520px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            }}>
                {/* Icon */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    animation: 'pulse 2s ease-in-out infinite',
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                    </svg>
                </div>

                <h1 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#f8fafc',
                    marginBottom: '12px',
                    fontFamily: "'Inter', sans-serif",
                }}>
                    Solicitud en revisión
                </h1>

                <p style={{
                    fontSize: '16px',
                    color: '#94a3b8',
                    lineHeight: '1.6',
                    marginBottom: '8px',
                }}>
                    Tu solicitud de registro para <strong style={{ color: '#e2e8f0' }}>{business?.name || 'tu negocio'}</strong> está siendo revisada por nuestro equipo.
                </p>

                <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.6',
                    marginBottom: '32px',
                }}>
                    Recibirás una notificación por email cuando tu cuenta sea aprobada. Este proceso normalmente toma entre 24-48 horas.
                </p>

                {/* Status indicator */}
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '32px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#f59e0b',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                        <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                            Estado: Pendiente de aprobación
                        </span>
                    </div>
                </div>

                {/* Info boxes */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '32px',
                }}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Seguridad</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Verificamos cada negocio para proteger los datos</div>
                    </div>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Confianza</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Solo negocios verificados operan en la plataforma</div>
                    </div>
                </div>

                <button
                    onClick={signOut}
                    style={{
                        background: 'rgba(148, 163, 184, 0.1)',
                        color: '#94a3b8',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '12px',
                        padding: '12px 32px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(148, 163, 184, 0.2)';
                        e.currentTarget.style.color = '#e2e8f0';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)';
                        e.currentTarget.style.color = '#94a3b8';
                    }}
                >
                    Cerrar sesión
                </button>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
        </div>
    );
}
