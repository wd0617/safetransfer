import { useState, useEffect, useRef } from 'react';
import './LandingPage.css';

interface LandingPageProps {
    onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [countersVisible, setCountersVisible] = useState(false);
    const statsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection observer for stats counter animation
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setCountersVisible(true);
            },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    // Intersection observer for scroll reveal
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );
        document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    return (
        <div className="landing-page">
            {/* ── Navigation ── */}
            <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="nav-inner">
                    <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="brand-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <span>SafeTransfer</span>
                    </div>

                    <ul className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
                        <li><a onClick={() => scrollTo('features')}>Funcionalidades</a></li>
                        <li><a onClick={() => scrollTo('how-it-works')}>Cómo Funciona</a></li>
                        <li><a onClick={() => scrollTo('privacy')}>Privacidad</a></li>
                        <li><a onClick={() => scrollTo('pricing')}>Precios</a></li>
                        <li><a onClick={() => scrollTo('faq')}>FAQ</a></li>
                    </ul>

                    <div className="nav-actions">
                        <button className="btn-ghost" onClick={onGetStarted}>Iniciar Sesión</button>
                        <button className="btn-cta-nav" onClick={onGetStarted}>
                            Prueba Gratis
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            {/* ── Hero Section ── */}
            <section className="hero-section">
                <div className="hero-bg">
                    <div className="hero-orb hero-orb-1" />
                    <div className="hero-orb hero-orb-2" />
                    <div className="hero-orb hero-orb-3" />
                    <div className="hero-grid-pattern" />
                </div>
                <div className="hero-inner">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <span className="badge-dot" />
                            Cumple con D.Lgs 231/2007 &amp; GDPR
                        </div>
                        <h1>
                            Evita multas.<br />
                            <span className="gradient-text">Protege tu negocio.</span>
                        </h1>
                        <p className="hero-subtitle">
                            El sistema de compliance #1 para negocios de money transfer en Italia.
                            Control automático de límites, verificación cross-business y reportes
                            listos para auditorías. <strong>Todo en una sola plataforma.</strong>
                        </p>
                        <div className="hero-cta-group">
                            <button className="btn-hero-primary" onClick={onGetStarted}>
                                Comenzar Gratis — 30 Días
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </button>
                            <button className="btn-hero-secondary" onClick={() => scrollTo('how-it-works')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                                Ver cómo funciona
                            </button>
                        </div>
                        <div className="hero-trust">
                            <div className="trust-avatars">
                                <div className="trust-avatar" style={{ background: '#3b82f6' }}>MT</div>
                                <div className="trust-avatar" style={{ background: '#10b981' }}>RS</div>
                                <div className="trust-avatar" style={{ background: '#f59e0b' }}>WU</div>
                                <div className="trust-avatar" style={{ background: '#8b5cf6' }}>GP</div>
                            </div>
                            <span>+150 negocios confían en SafeTransfer</span>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="hero-dashboard-card">
                            <div className="dash-header">
                                <div className="dash-dots"><span /><span /><span /></div>
                                <span className="dash-title">Panel SafeTransfer</span>
                            </div>
                            <div className="dash-body">
                                <div className="dash-stat-row">
                                    <div className="dash-stat green">
                                        <div className="dash-stat-icon">✓</div>
                                        <div>
                                            <div className="dash-stat-label">Cliente Verificado</div>
                                            <div className="dash-stat-value">Mario Rossi</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="dash-check-result">
                                    <div className="check-row">
                                        <span className="check-label">Puede transferir</span>
                                        <span className="check-badge ok">Sí</span>
                                    </div>
                                    <div className="check-row">
                                        <span className="check-label">Monto disponible</span>
                                        <span className="check-value">€ 450.00</span>
                                    </div>
                                    <div className="check-row">
                                        <span className="check-label">Usado (8 días)</span>
                                        <span className="check-value">€ 549.00</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-fill" style={{ width: '55%' }} />
                                        </div>
                                        <span className="progress-label">55% del límite</span>
                                    </div>
                                </div>

                                <div className="dash-stat-row">
                                    <div className="dash-stat red">
                                        <div className="dash-stat-icon">⛔</div>
                                        <div>
                                            <div className="dash-stat-label">Límite Alcanzado</div>
                                            <div className="dash-stat-value">Ana López — Próximo envío: 3 días</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hero-floating-card fc-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            <span>Sin multas en 12 meses</span>
                        </div>
                        <div className="hero-floating-card fc-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            <span>100% GDPR</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trusted Logos Bar ── */}
            <section className="logos-bar reveal-on-scroll">
                <div className="logos-inner">
                    <span className="logos-label">Compatible con los principales servicios de envío:</span>
                    <div className="logos-list">
                        <span>Western Union</span>
                        <span>MoneyGram</span>
                        <span>Ria</span>
                        <span>Small World</span>
                        <span>Remitly</span>
                    </div>
                </div>
            </section>

            {/* ── Problem Section ── */}
            <section className="problem-section reveal-on-scroll">
                <div className="section-inner">
                    <div className="problem-grid">
                        <div className="problem-content">
                            <div className="section-eyebrow">⚠️ El Problema</div>
                            <h2>Las multas por incumplimiento pueden <span className="text-danger">destruir tu negocio</span></h2>
                            <p>
                                La normativa italiana (D.Lgs 231/2007) establece un límite de <strong>€999.99</strong> por
                                cliente en un periodo de 8 días. Violarlo genera multas de hasta <strong>€50,000</strong> y
                                suspensión de licencia.
                            </p>
                            <div className="problem-stats">
                                <div className="problem-stat">
                                    <span className="problem-stat-number">€50,000</span>
                                    <span className="problem-stat-label">Multa máxima por violación</span>
                                </div>
                                <div className="problem-stat">
                                    <span className="problem-stat-number">67%</span>
                                    <span className="problem-stat-label">Negocios multados por error humano</span>
                                </div>
                                <div className="problem-stat">
                                    <span className="problem-stat-number">2-3</span>
                                    <span className="problem-stat-label">Meses para resolver una sanción</span>
                                </div>
                            </div>
                        </div>
                        <div className="problem-visual">
                            <div className="violation-card">
                                <div className="violation-icon">⚠️</div>
                                <div className="violation-title">Sin SafeTransfer</div>
                                <ul className="violation-list">
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Control manual con cuadernos o Excel
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        No sabes si el cliente envió en otro local
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Errores de cálculo por prisas del día a día
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Imposible preparar reportes para auditorías
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Riesgo constante de multas y sanciones
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="how-section" id="how-it-works">
                <div className="section-inner reveal-on-scroll">
                    <div className="section-eyebrow center">🚀 La Solución</div>
                    <h2 className="section-title">Cómo SafeTransfer protege tu negocio</h2>
                    <p className="section-desc">En solo 3 pasos, eliminas el riesgo de multas para siempre</p>

                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <div className="step-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                            </div>
                            <h3>Registra el Cliente</h3>
                            <p>Escanea el documento o introduce los datos. El sistema busca automáticamente si ya existe en la red.</p>
                        </div>
                        <div className="step-connector">
                            <svg width="40" height="24" viewBox="0 0 40 24"><path d="M0 12h35M30 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" /></svg>
                        </div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <div className="step-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <h3>Verificación Automática</h3>
                            <p>SafeTransfer verifica el límite en TODOS los negocios de la red. Resultado instantáneo: puede o no puede enviar.</p>
                        </div>
                        <div className="step-connector">
                            <svg width="40" height="24" viewBox="0 0 40 24"><path d="M0 12h35M30 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" /></svg>
                        </div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <div className="step-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            </div>
                            <h3>Transfiere con Confianza</h3>
                            <p>Realiza la transferencia sabiendo que estás 100% dentro del límite legal. Sin riesgos, sin multas.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features Section ── */}
            <section className="features-section" id="features">
                <div className="section-inner reveal-on-scroll">
                    <div className="section-eyebrow center">✨ Funcionalidades</div>
                    <h2 className="section-title">Todo lo que necesitas en un solo lugar</h2>
                    <p className="section-desc">Diseñado exclusivamente para negocios de money transfer en Italia</p>

                    <div className="features-showcase">
                        <div className="feature-item">
                            <div className="feature-icon-box blue">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Límites Automáticos</h3>
                                <p>Control del límite €999.99 por cliente cada 8 días. El sistema calcula automáticamente cuánto puede enviar.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box green">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Verificación Cross-Business</h3>
                                <p>Sabes si tu cliente ha enviado en otros locales de la red. Protección compartida, privacidad respetada.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box purple">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Reportes para Auditorías</h3>
                                <p>Genera reportes de compliance, financieros y de clientes listos para presentar ante la Guardia di Finanza.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box amber">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Alertas Inteligentes</h3>
                                <p>Notificaciones cuando un cliente se acerca al límite, documentos por vencer, o actividad sospechosa.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box rose">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Gestión de Clientes</h3>
                                <p>Base de datos completa con documentos, código fiscal, nacionalidad y todo el historial de transferencias.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box teal">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Multi-idioma</h3>
                                <p>Interfaz en Español, Italiano, Inglés, Francés, Hindi y Urdu. Perfecto para equipos multiculturales.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Counter ── */}
            <section className="stats-section" ref={statsRef}>
                <div className="section-inner">
                    <div className="stats-grid">
                        <CounterStat value={150} suffix="+" label="Negocios Activos" visible={countersVisible} />
                        <CounterStat value={50000} suffix="+" label="Transferencias Verificadas" visible={countersVisible} />
                        <CounterStat value={0} suffix="" label="Multas de Nuestros Clientes" visible={countersVisible} />
                        <CounterStat value={99.9} suffix="%" label="Uptime del Sistema" visible={countersVisible} decimals={1} />
                    </div>
                </div>
            </section>

            {/* ── Privacy Section ── */}
            <section className="privacy-section" id="privacy">
                <div className="section-inner reveal-on-scroll">
                    <div className="privacy-layout">
                        <div className="privacy-content">
                            <div className="section-eyebrow">🔒 Privacidad por Diseño</div>
                            <h2>Comparte compliance,<br /><span className="gradient-text">nunca datos sensibles</span></h2>
                            <p>Cumple con GDPR al 100%. Cuando verificas un cliente, solo ves lo que necesitas para cumplir la ley. Nunca ves datos de otros negocios.</p>
                            <ul className="privacy-checks">
                                <li><span className="priv-check">✓</span> Solo ves si el cliente puede transferir o no</li>
                                <li><span className="priv-check">✓</span> Monto disponible dentro del límite legal</li>
                                <li><span className="priv-check">✓</span> Días hasta que el límite se reinicia</li>
                                <li><span className="priv-check">✓</span> Auditoría completa de cada consulta</li>
                            </ul>
                        </div>
                        <div className="privacy-visual">
                            <div className="priv-cards-grid">
                                <PrivacyCard visible label="Puede transferir" value="✓ Sí" />
                                <PrivacyCard visible label="Disponible" value="€450.00" />
                                <PrivacyCard visible label="Monto usado" value="€549.00" />
                                <PrivacyCard visible label="Reinicio en" value="3 días" />
                                <PrivacyCard hidden label="Negocios donde envió" value="●●●●●●" />
                                <PrivacyCard hidden label="Montos individuales" value="●●●●●●" />
                                <PrivacyCard hidden label="Países de destino" value="●●●●●●" />
                                <PrivacyCard hidden label="Destinatarios" value="●●●●●●" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="testimonials-section reveal-on-scroll">
                <div className="section-inner">
                    <div className="section-eyebrow center">💬 Testimonios</div>
                    <h2 className="section-title">Lo que dicen nuestros clientes</h2>
                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>"Antes controlaba todo con un cuaderno. Desde que uso SafeTransfer no he tenido ni una sola multa. Me ahorra horas de trabajo cada semana."</p>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar" style={{ background: '#3b82f6' }}>MR</div>
                                <div>
                                    <strong>Marco R.</strong>
                                    <span>Money Transfer — Roma</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>"La verificación cross-business es increíble. Un cliente que llegó a mi local ya había enviado €800 en otro sitio. SafeTransfer me salvó de una multa segura."</p>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar" style={{ background: '#10b981' }}>FK</div>
                                <div>
                                    <strong>Fatima K.</strong>
                                    <span>Money Transfer — Milano</span>
                                </div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>"Los reportes automáticos son perfectos para las auditorías. Cuando la Guardia di Finanza visitó mi local, tenía todo listo en 5 minutos."</p>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar" style={{ background: '#f59e0b' }}>AP</div>
                                <div>
                                    <strong>Ahmed P.</strong>
                                    <span>Money Transfer — Napoli</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section className="pricing-section" id="pricing">
                <div className="section-inner reveal-on-scroll">
                    <div className="section-eyebrow center">💎 Precios</div>
                    <h2 className="section-title">Invierte menos de lo que cuesta una multa</h2>
                    <p className="section-desc">Sin sorpresas. Sin compromisos. Cancela cuando quieras.</p>

                    <div className="pricing-cards">
                        <div className="pricing-card-new">
                            <h3>Basic</h3>
                            <div className="pricing-amount"><span className="currency">€</span>29<span className="period">/mes</span></div>
                            <p className="pricing-desc">Perfecto para un solo local</p>
                            <ul className="pricing-list">
                                <li><span className="li-check">✓</span> 1 usuario</li>
                                <li><span className="li-check">✓</span> Gestión de clientes</li>
                                <li><span className="li-check">✓</span> Verificación de límites</li>
                                <li><span className="li-check">✓</span> Verificación cross-business</li>
                                <li><span className="li-check">✓</span> Alertas automáticas</li>
                                <li><span className="li-check">✓</span> Reportes básicos</li>
                                <li><span className="li-check">✓</span> Soporte por email</li>
                            </ul>
                            <button className="btn-pricing" onClick={onGetStarted}>Comenzar Gratis</button>
                        </div>

                        <div className="pricing-card-new popular">
                            <div className="popular-tag">⭐ Más Popular</div>
                            <h3>Pro</h3>
                            <div className="pricing-amount"><span className="currency">€</span>49<span className="period">/mes</span></div>
                            <p className="pricing-desc">Para negocios en crecimiento</p>
                            <ul className="pricing-list">
                                <li><span className="li-check">✓</span> Hasta 5 usuarios</li>
                                <li><span className="li-check">✓</span> Todo en Basic</li>
                                <li><span className="li-check">✓</span> Reportes avanzados</li>
                                <li><span className="li-check">✓</span> Alertas personalizadas</li>
                                <li><span className="li-check">✓</span> Exportar a PDF/Excel</li>
                                <li><span className="li-check">✓</span> Multi-idioma completo</li>
                                <li><span className="li-check">✓</span> Soporte prioritario</li>
                            </ul>
                            <button className="btn-pricing primary" onClick={onGetStarted}>Comenzar Gratis</button>
                        </div>

                        <div className="pricing-card-new">
                            <h3>Enterprise</h3>
                            <div className="pricing-amount"><span className="currency">€</span>99<span className="period">/mes</span></div>
                            <p className="pricing-desc">Para cadenas y franquicias</p>
                            <ul className="pricing-list">
                                <li><span className="li-check">✓</span> Usuarios ilimitados</li>
                                <li><span className="li-check">✓</span> Todo en Pro</li>
                                <li><span className="li-check">✓</span> API de integración</li>
                                <li><span className="li-check">✓</span> Panel multi-sucursal</li>
                                <li><span className="li-check">✓</span> Analytics avanzado</li>
                                <li><span className="li-check">✓</span> Onboarding dedicado</li>
                                <li><span className="li-check">✓</span> Soporte 24/7</li>
                            </ul>
                            <button className="btn-pricing" onClick={onGetStarted}>Contactar Ventas</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="faq-section" id="faq">
                <div className="section-inner reveal-on-scroll">
                    <div className="section-eyebrow center">❓ Preguntas Frecuentes</div>
                    <h2 className="section-title">¿Tienes dudas? Tenemos respuestas</h2>
                    <div className="faq-list">
                        {faqData.map((faq, i) => (
                            <div key={i} className={`faq-item ${activeFaq === i ? 'open' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                                <div className="faq-question">
                                    <span>{faq.q}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points={activeFaq === i ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} /></svg>
                                </div>
                                <div className="faq-answer"><p>{faq.a}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="final-cta-section">
                <div className="cta-bg">
                    <div className="cta-orb cta-orb-1" />
                    <div className="cta-orb cta-orb-2" />
                </div>
                <div className="section-inner">
                    <h2>Protege tu negocio hoy mismo</h2>
                    <p>Regístrate gratis y comienza a verificar clientes en menos de 5 minutos. Sin tarjeta de crédito.</p>
                    <button className="btn-final-cta" onClick={onGetStarted}>
                        Crear Cuenta Gratis
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                    <span className="cta-note">30 días gratis · Sin compromiso · Cancela cuando quieras</span>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <div className="section-inner">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="nav-brand">
                                <div className="brand-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
                                <span>SafeTransfer</span>
                            </div>
                            <p>Sistema de compliance para money transfer. Diseñado para cumplir con D.Lgs 231/2007 y GDPR.</p>
                        </div>
                        <div className="footer-links">
                            <h4>Producto</h4>
                            <a onClick={() => scrollTo('features')}>Funcionalidades</a>
                            <a onClick={() => scrollTo('pricing')}>Precios</a>
                            <a onClick={() => scrollTo('faq')}>FAQ</a>
                        </div>
                        <div className="footer-links">
                            <h4>Legal</h4>
                            <a href="#">Términos de Servicio</a>
                            <a href="#">Política de Privacidad</a>
                            <a href="#">GDPR</a>
                        </div>
                        <div className="footer-links">
                            <h4>Contacto</h4>
                            <a href="mailto:info@safetransfer.app">info@safetransfer.app</a>
                            <a href="#">Soporte</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <span>© 2024 SafeTransfer. Todos los derechos reservados.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ── Sub-components ── */
function CounterStat({ value, suffix, label, visible, decimals = 0 }: { value: number; suffix: string; label: string; visible: boolean; decimals?: number }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const duration = 2000;
        const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * value);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [visible, value]);

    const display = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();
    return (
        <div className="stat-counter">
            <span className="stat-number">{display}{suffix}</span>
            <span className="stat-label">{label}</span>
        </div>
    );
}

function PrivacyCard({ visible, hidden, label, value }: { visible?: boolean; hidden?: boolean; label: string; value: string }) {
    return (
        <div className={`priv-card ${visible ? 'priv-visible' : ''} ${hidden ? 'priv-hidden' : ''}`}>
            <div className="priv-card-tag">{visible ? '✓ Visible' : '✗ Oculto'}</div>
            <div className="priv-card-label">{label}</div>
            <div className="priv-card-value">{value}</div>
        </div>
    );
}

/* ── Data ── */
const faqData = [
    { q: '¿Qué pasa si mi cliente ya envió dinero en otro local?', a: 'SafeTransfer verifica automáticamente en toda la red. Si el cliente ya usó parte del límite en otro negocio, verás exactamente cuánto puede enviar todavía, sin revelar detalles del otro negocio.' },
    { q: '¿Es obligatorio usar un sistema como SafeTransfer?', a: 'La ley italiana no obliga a usar un software específico, pero sí exige controlar los límites. Sin un sistema automatizado, el riesgo de error humano y de multas es muy alto. SafeTransfer es la forma más segura de cumplir.' },
    { q: '¿Mis datos están seguros?', a: 'Absolutamente. Usamos cifrado de extremo a extremo, servidores en la UE, y cumplimos al 100% con GDPR. Cada consulta queda registrada en un log de auditoría inmutable.' },
    { q: '¿Puedo probarlo antes de pagar?', a: 'Sí, ofrecemos 30 días gratis sin necesidad de tarjeta de crédito. Puedes usar todas las funcionalidades sin restricciones durante el periodo de prueba.' },
    { q: '¿Qué pasa cuando la Guardia di Finanza hace una auditoría?', a: 'Con SafeTransfer puedes generar reportes de compliance en segundos. Todos los datos de transferencias, verificaciones y clientes están organizados y listos para presentar.' },
    { q: '¿Funciona con todos los servicios de money transfer?', a: 'Sí. SafeTransfer es independiente del servicio que uses (Western Union, MoneyGram, Ria, etc.). Lo importante es que registres cada transferencia en el sistema.' },
];
