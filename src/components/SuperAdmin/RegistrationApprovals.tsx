import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock, Building2, Mail, User, RefreshCw, Phone, MapPin, FileText } from 'lucide-react';

interface PendingBusiness {
    id: string;
    name: string;
    email: string;
    phone?: string;
    partita_iva?: string;
    codice_fiscale?: string;
    pec_email?: string;
    city?: string;
    country?: string;
    address?: string;
    business_type?: string;
    website?: string;
    contact_name?: string;
    status: string;
    created_at: string;
    admin_user?: {
        full_name: string;
        email: string;
    };
}

export function RegistrationApprovals() {
    const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
    const [filter, setFilter] = useState<'pending_approval' | 'rejected' | 'all'>('pending_approval');

    const fetchPendingBusinesses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('businesses')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter === 'pending_approval') {
                query = query.eq('status', 'pending_approval' as any);
            } else if (filter === 'rejected') {
                query = query.eq('status', 'rejected' as any);
            } else {
                query = query.in('status', ['pending_approval', 'rejected'] as any);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch admin users for each business
            const enriched = await Promise.all((data || []).map(async (biz) => {
                const { data: buData } = await supabase
                    .from('business_users')
                    .select('full_name, email')
                    .eq('business_id', biz.id)
                    .eq('role', 'admin')
                    .maybeSingle();

                return {
                    id: biz.id,
                    name: biz.name,
                    email: biz.email,
                    phone: (biz as any).phone || '',
                    partita_iva: (biz as any).partita_iva || '',
                    codice_fiscale: (biz as any).codice_fiscale || '',
                    pec_email: (biz as any).pec_email || '',
                    city: (biz as any).city || '',
                    country: (biz as any).country || '',
                    address: (biz as any).address || '',
                    business_type: (biz as any).business_type || '',
                    website: (biz as any).website || '',
                    contact_name: (biz as any).contact_name || '',
                    status: biz.status || 'pending_approval',
                    created_at: biz.created_at || '',
                    admin_user: buData || undefined,
                } as PendingBusiness;
            }));

            setPendingBusinesses(enriched);
        } catch (err) {
            console.error('Error fetching pending businesses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingBusinesses();
    }, [filter]);

    const handleApprove = async (businessId: string) => {
        setActionLoading(businessId);
        try {
            const { error } = await (supabase.rpc as any)('approve_business', {
                p_business_id: businessId,
            });
            if (error) throw error;
            await fetchPendingBusinesses();
        } catch (err) {
            console.error('Error approving business:', err);
            alert('Error al aprobar: ' + (err as Error).message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (businessId: string) => {
        setActionLoading(businessId);
        try {
            const { error } = await (supabase.rpc as any)('reject_business', {
                p_business_id: businessId,
                p_reason: rejectReason || 'Solicitud rechazada',
            });
            if (error) throw error;
            setShowRejectModal(null);
            setRejectReason('');
            await fetchPendingBusinesses();
        } catch (err) {
            console.error('Error rejecting business:', err);
            alert('Error al rechazar: ' + (err as Error).message);
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Solicitudes de Registro</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Aprueba o rechaza solicitudes de nuevos negocios
                    </p>
                </div>
                <button
                    onClick={fetchPendingBusinesses}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'pending_approval' as const, label: 'Pendientes', color: 'amber' },
                    { key: 'rejected' as const, label: 'Rechazadas', color: 'red' },
                    { key: 'all' as const, label: 'Todas', color: 'slate' },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.key
                            ? f.color === 'amber'
                                ? 'bg-amber-100 text-amber-800'
                                : f.color === 'red'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-slate-200 text-slate-800'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Cargando solicitudes...</div>
            ) : pendingBusinesses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No hay solicitudes {filter === 'pending_approval' ? 'pendientes' : ''}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingBusinesses.map((biz) => (
                        <div
                            key={biz.id}
                            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${biz.status === 'pending_approval' ? 'bg-amber-100' : 'bg-red-100'
                                            }`}>
                                            <Building2 className={`w-5 h-5 ${biz.status === 'pending_approval' ? 'text-amber-600' : 'text-red-600'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-lg">{biz.name}</h3>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${biz.status === 'pending_approval'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {biz.status === 'pending_approval' ? '⏳ Pendiente' : '❌ Rechazada'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            {biz.email}
                                        </div>
                                        {biz.admin_user && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <User className="w-4 h-4 text-slate-400" />
                                                {biz.admin_user.full_name} ({biz.admin_user.email})
                                            </div>
                                        )}
                                        {biz.phone && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                {biz.phone}
                                            </div>
                                        )}
                                    </div>

                                    {/* Business verification details */}
                                    <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />Datos fiscales y ubicación
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                            {biz.partita_iva && (
                                                <div><span className="text-slate-400">P.IVA:</span> <span className="font-medium text-slate-700">{biz.partita_iva}</span></div>
                                            )}
                                            {biz.codice_fiscale && (
                                                <div><span className="text-slate-400">C.F.:</span> <span className="font-medium text-slate-700">{biz.codice_fiscale}</span></div>
                                            )}
                                            {biz.business_type && (
                                                <div><span className="text-slate-400">Tipo:</span> <span className="font-medium text-slate-700">{biz.business_type.replace(/_/g, ' ')}</span></div>
                                            )}
                                            {biz.pec_email && (
                                                <div><span className="text-slate-400">PEC:</span> <span className="font-medium text-slate-700">{biz.pec_email}</span></div>
                                            )}
                                            {biz.city && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                    <span className="font-medium text-slate-700">{biz.city}{biz.country ? `, ${biz.country}` : ''}</span>
                                                </div>
                                            )}
                                            {biz.address && (
                                                <div><span className="text-slate-400">Dir:</span> <span className="font-medium text-slate-700">{biz.address}</span></div>
                                            )}
                                            {biz.website && (
                                                <div><span className="text-slate-400">Web:</span> <a href={biz.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{biz.website}</a></div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-slate-400">
                                        Registrado: {formatDate(biz.created_at)}
                                    </div>
                                </div>

                                {biz.status === 'pending_approval' && (
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handleApprove(biz.id)}
                                            disabled={actionLoading === biz.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            {actionLoading === biz.id ? 'Aprobando...' : 'Aprobar'}
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(biz.id)}
                                            disabled={actionLoading === biz.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Rechazar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Rechazar solicitud</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motivo del rechazo (opcional)..."
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={actionLoading === showRejectModal}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {actionLoading === showRejectModal ? 'Rechazando...' : 'Confirmar rechazo'}
                            </button>
                            <button
                                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
