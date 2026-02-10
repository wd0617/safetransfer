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
                        <li><a onClick={() => scrollTo('features')}>Funzionalità</a></li>
                        <li><a onClick={() => scrollTo('how-it-works')}>Come Funziona</a></li>
                        <li><a onClick={() => scrollTo('privacy')}>Privacy</a></li>
                        <li><a onClick={() => scrollTo('pricing')}>Prezzi</a></li>
                        <li><a onClick={() => scrollTo('faq')}>FAQ</a></li>
                    </ul>

                    <div className="nav-actions">
                        <button className="btn-ghost" onClick={onGetStarted}>Accedi</button>
                        <button className="btn-cta-nav" onClick={onGetStarted}>
                            Prova Gratis
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
                            Conforme al D.Lgs 231/2007 &amp; GDPR
                        </div>
                        <h1>
                            Evita le multe.<br />
                            <span className="gradient-text">Proteggi la tua attività.</span>
                        </h1>
                        <p className="hero-subtitle">
                            Il sistema di compliance #1 per attività di money transfer in Italia.
                            Controllo automatico dei limiti, verifica cross-business e report
                            pronti per le ispezioni. <strong>Tutto in un'unica piattaforma.</strong>
                        </p>
                        <div className="hero-cta-group">
                            <button className="btn-hero-primary" onClick={onGetStarted}>
                                Inizia Gratis — 30 Giorni
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </button>
                            <button className="btn-hero-secondary" onClick={() => scrollTo('how-it-works')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                                Scopri come funziona
                            </button>
                        </div>
                        <div className="hero-trust">
                            <div className="trust-avatars">
                                <div className="trust-avatar" style={{ background: '#3b82f6' }}>MT</div>
                                <div className="trust-avatar" style={{ background: '#10b981' }}>RS</div>
                                <div className="trust-avatar" style={{ background: '#f59e0b' }}>WU</div>
                                <div className="trust-avatar" style={{ background: '#8b5cf6' }}>GP</div>
                            </div>
                            <span>+150 attività si affidano a SafeTransfer</span>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="hero-dashboard-card">
                            <div className="dash-header">
                                <div className="dash-dots"><span /><span /><span /></div>
                                <span className="dash-title">Pannello SafeTransfer</span>
                            </div>
                            <div className="dash-body">
                                <div className="dash-stat-row">
                                    <div className="dash-stat green">
                                        <div className="dash-stat-icon">✓</div>
                                        <div>
                                            <div className="dash-stat-label">Cliente Verificato</div>
                                            <div className="dash-stat-value">Mario Rossi</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="dash-check-result">
                                    <div className="check-row">
                                        <span className="check-label">Può trasferire</span>
                                        <span className="check-badge ok">Sì</span>
                                    </div>
                                    <div className="check-row">
                                        <span className="check-label">Importo disponibile</span>
                                        <span className="check-value">€ 450.00</span>
                                    </div>
                                    <div className="check-row">
                                        <span className="check-label">Utilizzato (8 giorni)</span>
                                        <span className="check-value">€ 549.00</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-fill" style={{ width: '55%' }} />
                                        </div>
                                        <span className="progress-label">55% del limite</span>
                                    </div>
                                </div>

                                <div className="dash-stat-row">
                                    <div className="dash-stat red">
                                        <div className="dash-stat-icon">⛔</div>
                                        <div>
                                            <div className="dash-stat-label">Limite Raggiunto</div>
                                            <div className="dash-stat-value">Ana López — Prossimo invio: 3 giorni</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hero-floating-card fc-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            <span>Zero multe in 12 mesi</span>
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
                    <span className="logos-label">Compatibile con i principali servizi di invio:</span>
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
                            <div className="section-eyebrow">⚠️ Il Problema</div>
                            <h2>Le multe per non conformità possono <span className="text-danger">distruggere la tua attività</span></h2>
                            <p>
                                La normativa italiana (D.Lgs 231/2007) stabilisce un limite di <strong>€999,99</strong> per
                                cliente in un periodo di 8 giorni. Violarlo comporta multe fino a <strong>€50.000</strong> e
                                sospensione della licenza.
                            </p>
                            <div className="problem-stats">
                                <div className="problem-stat">
                                    <span className="problem-stat-number">€50.000</span>
                                    <span className="problem-stat-label">Multa massima per violazione</span>
                                </div>
                                <div className="problem-stat">
                                    <span className="problem-stat-number">67%</span>
                                    <span className="problem-stat-label">Attività multate per errore umano</span>
                                </div>
                                <div className="problem-stat">
                                    <span className="problem-stat-number">2-3</span>
                                    <span className="problem-stat-label">Mesi per risolvere una sanzione</span>
                                </div>
                            </div>
                        </div>
                        <div className="problem-visual">
                            <div className="violation-card">
                                <div className="violation-icon">⚠️</div>
                                <div className="violation-title">Senza SafeTransfer</div>
                                <ul className="violation-list">
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Controllo manuale con quaderni o Excel
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Non sai se il cliente ha inviato in un altro locale
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Errori di calcolo per la fretta quotidiana
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Impossibile preparare report per le ispezioni
                                    </li>
                                    <li>
                                        <span className="x-icon">✗</span>
                                        Rischio costante di multe e sanzioni
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
                    <div className="section-eyebrow center">🚀 La Soluzione</div>
                    <h2 className="section-title">Come SafeTransfer protegge la tua attività</h2>
                    <p className="section-desc">In soli 3 passaggi, elimini il rischio di multe per sempre</p>

                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <div className="step-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                            </div>
                            <h3>Registra il Cliente</h3>
                            <p>Scansiona il documento o inserisci i dati. Il sistema cerca automaticamente se esiste già nella rete.</p>
                        </div>
                        <div className="step-connector">
                            <svg width="40" height="24" viewBox="0 0 40 24"><path d="M0 12h35M30 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" /></svg>
                        </div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <div className="step-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <h3>Verifica Automatica</h3>
                            <p>SafeTransfer verifica il limite in TUTTE le attività della rete. Risultato istantaneo: può o non può inviare.</p>
                        </div>
                        <div className="step-connector">
                            <svg width="40" height="24" viewBox="0 0 40 24"><path d="M0 12h35M30 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" /></svg>
                        </div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <div className="step-icon-wrapper">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            </div>
                            <h3>Trasferisci con Sicurezza</h3>
                            <p>Effettua il trasferimento sapendo di essere al 100% entro il limite legale. Senza rischi, senza multe.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features Section ── */}
            <section className="features-section" id="features">
                <div className="section-inner reveal-on-scroll">
                    <div className="section-eyebrow center">✨ Funzionalità</div>
                    <h2 className="section-title">Tutto ciò di cui hai bisogno in un unico posto</h2>
                    <p className="section-desc">Progettato esclusivamente per attività di money transfer in Italia</p>

                    <div className="features-showcase">
                        <div className="feature-item">
                            <div className="feature-icon-box blue">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Limiti Automatici</h3>
                                <p>Controllo del limite €999,99 per cliente ogni 8 giorni. Il sistema calcola automaticamente quanto può inviare.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box green">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Verifica Cross-Business</h3>
                                <p>Sai se il tuo cliente ha inviato in altri locali della rete. Protezione condivisa, privacy rispettata.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box purple">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Report per Ispezioni</h3>
                                <p>Genera report di compliance, finanziari e sui clienti pronti da presentare alla Guardia di Finanza.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box amber">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Avvisi Intelligenti</h3>
                                <p>Notifiche quando un cliente si avvicina al limite, documenti in scadenza o attività sospetta.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box rose">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Gestione Clienti</h3>
                                <p>Database completo con documenti, codice fiscale, nazionalità e cronologia completa dei trasferimenti.</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon-box teal">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                            </div>
                            <div className="feature-text">
                                <h3>Multi-lingua</h3>
                                <p>Interfaccia in Italiano, Spagnolo, Inglese, Hindi e Urdu. Perfetto per team multiculturali.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Counter ── */}
            <section className="stats-section" ref={statsRef}>
                <div className="section-inner">
                    <div className="stats-grid">
                        <CounterStat value={150} suffix="+" label="Attività Attive" visible={countersVisible} />
                        <CounterStat value={50000} suffix="+" label="Trasferimenti Verificati" visible={countersVisible} />
                        <CounterStat value={0} suffix="" label="Multe dei Nostri Clienti" visible={countersVisible} />
                        <CounterStat value={99.9} suffix="%" label="Uptime del Sistema" visible={countersVisible} decimals={1} />
                    </div>
                </div>
            </section>

            {/* ── Privacy Section ── */}
            <section className="privacy-section" id="privacy">
                <div className="section-inner reveal-on-scroll">
                    <div className="privacy-layout">
                        <div className="privacy-content">
                            <div className="section-eyebrow">🔒 Privacy by Design</div>
                            <h2>Condividi la compliance,<br /><span className="gradient-text">mai i dati sensibili</span></h2>
                            <p>100% conforme al GDPR. Quando verifichi un cliente, vedi solo ciò che serve per rispettare la legge. Non vedi mai i dati di altre attività.</p>
                            <ul className="privacy-checks">
                                <li><span className="priv-check">✓</span> Vedi solo se il cliente può trasferire o meno</li>
                                <li><span className="priv-check">✓</span> Importo disponibile entro il limite legale</li>
                                <li><span className="priv-check">✓</span> Giorni fino al reset del limite</li>
                                <li><span className="priv-check">✓</span> Audit completo di ogni consultazione</li>
                            </ul>
                        </div>
                        <div className="privacy-visual">
                            <div className="priv-cards-grid">
                                <PrivacyCard visible label="Può trasferire" value="✓ Sì" />
                                <PrivacyCard visible label="Disponibile" value="€450,00" />
                                <PrivacyCard visible label="Importo usato" value="€549,00" />
                                <PrivacyCard visible label="Reset tra" value="3 giorni" />
                                <PrivacyCard hidden label="Attività dove ha inviato" value="●●●●●●" />
                                <PrivacyCard hidden label="Importi individuali" value="●●●●●●" />
                                <PrivacyCard hidden label="Paesi di destinazione" value="●●●●●●" />
                                <PrivacyCard hidden label="Destinatari" value="●●●●●●" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="testimonials-section reveal-on-scroll">
                <div className="section-inner">
                    <div className="section-eyebrow center">💬 Testimonianze</div>
                    <h2 className="section-title">Cosa dicono i nostri clienti</h2>
                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <div className="testimonial-stars">★★★★★</div>
                            <p>"Prima controllavo tutto con un quaderno. Da quando uso SafeTransfer non ho avuto neanche una multa. Mi risparmia ore di lavoro ogni settimana."</p>
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
                            <p>"La verifica cross-business è incredibile. Un cliente arrivato nel mio locale aveva già inviato €800 in un altro punto. SafeTransfer mi ha salvato da una multa sicura."</p>
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
                            <p>"I report automatici sono perfetti per le ispezioni. Quando la Guardia di Finanza ha visitato il mio locale, avevo tutto pronto in 5 minuti."</p>
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
                    <div className="section-eyebrow center">💎 Prezzi</div>
                    <h2 className="section-title">Investi meno di quanto costa una multa</h2>
                    <p className="section-desc">Senza sorprese. Senza vincoli. Cancella quando vuoi.</p>

                    <div className="pricing-cards">
                        <div className="pricing-card-new">
                            <h3>Basic</h3>
                            <div className="pricing-amount"><span className="currency">€</span>29<span className="period">/mese</span></div>
                            <p className="pricing-desc">Perfetto per un singolo locale</p>
                            <ul className="pricing-list">
                                <li><span className="li-check">✓</span> 1 utente</li>
                                <li><span className="li-check">✓</span> Gestione clienti</li>
                                <li><span className="li-check">✓</span> Verifica dei limiti</li>
                                <li><span className="li-check">✓</span> Verifica cross-business</li>
                                <li><span className="li-check">✓</span> Avvisi automatici</li>
                                <li><span className="li-check">✓</span> Report base</li>
                                <li><span className="li-check">✓</span> Supporto via email</li>
                            </ul>
                            <button className="btn-pricing" onClick={onGetStarted}>Inizia Gratis</button>
                        </div>

                        <div className="pricing-card-new popular">
                            <div className="popular-tag">⭐ Più Popolare</div>
                            <h3>Pro</h3>
                            <div className="pricing-amount"><span className="currency">€</span>49<span className="period">/mese</span></div>
                            <p className="pricing-desc">Per attività in crescita</p>
                            <ul className="pricing-list">
                                <li><span className="li-check">✓</span> Fino a 5 utenti</li>
                                <li><span className="li-check">✓</span> Tutto in Basic</li>
                                <li><span className="li-check">✓</span> Report avanzati</li>
                                <li><span className="li-check">✓</span> Avvisi personalizzati</li>
                                <li><span className="li-check">✓</span> Esporta in PDF/Excel</li>
                                <li><span className="li-check">✓</span> Multi-lingua completo</li>
                                <li><span className="li-check">✓</span> Supporto prioritario</li>
                            </ul>
                            <button className="btn-pricing primary" onClick={onGetStarted}>Inizia Gratis</button>
                        </div>

                        <div className="pricing-card-new">
                            <h3>Enterprise</h3>
                            <div className="pricing-amount"><span className="currency">€</span>99<span className="period">/mese</span></div>
                            <p className="pricing-desc">Per catene e franchising</p>
                            <ul className="pricing-list">
                                <li><span className="li-check">✓</span> Utenti illimitati</li>
                                <li><span className="li-check">✓</span> Tutto in Pro</li>
                                <li><span className="li-check">✓</span> API di integrazione</li>
                                <li><span className="li-check">✓</span> Pannello multi-sede</li>
                                <li><span className="li-check">✓</span> Analytics avanzato</li>
                                <li><span className="li-check">✓</span> Onboarding dedicato</li>
                                <li><span className="li-check">✓</span> Supporto 24/7</li>
                            </ul>
                            <button className="btn-pricing" onClick={onGetStarted}>Contatta Vendite</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="faq-section" id="faq">
                <div className="section-inner reveal-on-scroll">
                    <div className="section-eyebrow center">❓ Domande Frequenti</div>
                    <h2 className="section-title">Hai dei dubbi? Abbiamo le risposte</h2>
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
                    <h2>Proteggi la tua attività oggi stesso</h2>
                    <p>Registrati gratis e inizia a verificare i clienti in meno di 5 minuti. Senza carta di credito.</p>
                    <button className="btn-final-cta" onClick={onGetStarted}>
                        Crea Account Gratis
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                    <span className="cta-note">30 giorni gratis · Senza impegno · Cancella quando vuoi</span>
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
                            <p>Sistema di compliance per money transfer. Progettato per la conformità al D.Lgs 231/2007 e al GDPR.</p>
                        </div>
                        <div className="footer-links">
                            <h4>Prodotto</h4>
                            <a onClick={() => scrollTo('features')}>Funzionalità</a>
                            <a onClick={() => scrollTo('pricing')}>Prezzi</a>
                            <a onClick={() => scrollTo('faq')}>FAQ</a>
                        </div>
                        <div className="footer-links">
                            <h4>Legale</h4>
                            <a href="#">Termini di Servizio</a>
                            <a href="#">Informativa sulla Privacy</a>
                            <a href="#">GDPR</a>
                        </div>
                        <div className="footer-links">
                            <h4>Contatti</h4>
                            <a href="mailto:info@safetransfer.app">info@safetransfer.app</a>
                            <a href="#">Supporto</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <span>© 2024 SafeTransfer. Tutti i diritti riservati.</span>
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
            <div className="priv-card-tag">{visible ? '✓ Visibile' : '✗ Nascosto'}</div>
            <div className="priv-card-label">{label}</div>
            <div className="priv-card-value">{value}</div>
        </div>
    );
}

/* ── Data ── */
const faqData = [
    { q: 'Cosa succede se il mio cliente ha già inviato denaro in un altro locale?', a: 'SafeTransfer verifica automaticamente in tutta la rete. Se il cliente ha già utilizzato parte del limite in un\'altra attività, vedrai esattamente quanto può ancora inviare, senza rivelare i dettagli dell\'altra attività.' },
    { q: 'È obbligatorio usare un sistema come SafeTransfer?', a: 'La legge italiana non obbliga a usare un software specifico, ma impone il controllo dei limiti. Senza un sistema automatizzato, il rischio di errore umano e di multe è molto alto. SafeTransfer è il modo più sicuro per essere in regola.' },
    { q: 'I miei dati sono al sicuro?', a: 'Assolutamente. Utilizziamo crittografia end-to-end, server nell\'UE e siamo conformi al 100% al GDPR. Ogni consultazione viene registrata in un log di audit immutabile.' },
    { q: 'Posso provarlo prima di pagare?', a: 'Sì, offriamo 30 giorni gratuiti senza carta di credito. Puoi usare tutte le funzionalità senza restrizioni durante il periodo di prova.' },
    { q: 'Cosa succede quando la Guardia di Finanza effettua un\'ispezione?', a: 'Con SafeTransfer puoi generare report di compliance in pochi secondi. Tutti i dati su trasferimenti, verifiche e clienti sono organizzati e pronti da presentare.' },
    { q: 'Funziona con tutti i servizi di money transfer?', a: 'Sì. SafeTransfer è indipendente dal servizio che utilizzi (Western Union, MoneyGram, Ria, ecc.). L\'importante è che registri ogni trasferimento nel sistema.' },
];
