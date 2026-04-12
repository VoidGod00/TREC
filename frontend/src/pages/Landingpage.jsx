import React from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Icon helpers ─────────────────────────────────────────────────────────────
const IconChart = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18l5-7 4 4 3-5 4 8"/><circle cx="3" cy="18" r="1.5" fill="#a78bfa"/>
    </svg>
);
const IconCalendar = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="18" height="14" rx="2"/><path d="M16 2v6M6 2v6M2 10h18"/>
    </svg>
);
const IconBot = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="16" height="12" rx="3"/><path d="M11 2v4M8 14h.01M14 14h.01M8 10h6"/>
    </svg>
);
const IconBell = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
);
const IconStar = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
);
const IconShield = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l3 3 5-5"/>
    </svg>
);
const IconTrend = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect width="20" height="20" rx="5" fill="#7c3aed"/>
        <path d="M4 13l4-5 3 3 2-3 3 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: <IconCalendar/>, bg: 'rgba(52,211,153,0.12)', title: 'Expense tracking', desc: 'Add transactions in seconds. Filter by category, date, merchant or amount. Full edit and delete with search.' },
    { icon: <IconChart/>, bg: 'rgba(124,58,237,0.12)', title: 'Analytics dashboard', desc: 'Category breakdowns, 6-month trends, savings rate and budget status — all in one view.' },
    { icon: <IconBot/>, bg: 'rgba(99,102,241,0.12)', title: 'AI assistant', desc: 'Ask Gemini anything about your finances. Get real answers based on your actual transaction data.' },
    { icon: <IconBell/>, bg: 'rgba(251,191,36,0.10)', title: 'Budget alerts', desc: 'Set monthly limits per category. Visual progress bars warn you before you exceed your budget.' },
    { icon: <IconStar/>, bg: 'rgba(248,113,113,0.10)', title: 'Auto-categorization', desc: 'Type "Starbucks" and AI instantly classifies it as Food. No manual tagging needed.' },
    { icon: <IconShield/>, bg: 'rgba(20,184,166,0.10)', title: 'JWT security', desc: 'bcrypt passwords, short-lived access tokens, auto-refresh, account lockout. Enterprise-grade auth.' },
];

const STEPS = [
    { n: '1', title: 'Create your account', desc: 'Register with email and a secure password. JWT tokens keep you signed in safely.' },
    { n: '2', title: 'Add your transactions', desc: 'Log income and expenses manually or let AI auto-categorize them for you instantly.' },
    { n: '3', title: 'Ask AI, get insights', desc: 'Chat with Gemini about your spending and receive a personalised savings plan.' },
];

const PLANS = [
    {
        name: 'Personal', price: 'Free', sub: 'forever', featured: false,
        desc: 'Perfect for individuals getting started with expense tracking.',
        features: ['Unlimited transactions', 'Full analytics dashboard', 'Budget management', 'SQLite local database', 'AI (bring your own key)'],
    },
    {
        name: 'Pro', price: '₹299', sub: '/ month', featured: true,
        desc: 'Everything in Personal, plus hosted AI and PostgreSQL.',
        features: ['Everything in Personal', 'Hosted PostgreSQL database', 'AI assistant included', 'Redis caching', 'Priority support'],
    },
    {
        name: 'Enterprise', price: 'Custom', sub: '', featured: false,
        desc: 'Multi-user, self-hosted, full source code and support SLA.',
        features: ['Everything in Pro', 'Full source code', 'Multi-user support', 'Custom deployment', 'SLA guarantee'],
    },
];

const CHECKS = [
    'AI-powered insights — Gemini analyses every rupee you spend.',
    'Full CRUD tracking — Add, edit, filter and search transactions instantly.',
    'Budget alerts — Get notified before you overspend any category.',
    'JWT-secured — Enterprise-grade auth with auto token refresh.',
];

const BAR_HEIGHTS = [
    { inc: 55, exp: 38 }, { inc: 60, exp: 42 }, { inc: 55, exp: 45 },
    { inc: 60, exp: 50 }, { inc: 58, exp: 44 }, { inc: 62, exp: 46 },
];

const RECENT_TX = [
    { dot: '#34d399', name: 'Salary',    cat: 'salary',      amt: '+₹65,000', color: '#34d399' },
    { dot: '#f87171', name: 'Rent',      cat: 'rent',        amt: '-₹18,000', color: '#f87171' },
    { dot: '#f87171', name: 'BigBasket', cat: 'food',        amt: '-₹3,240',  color: '#f87171' },
    { dot: '#f87171', name: 'DMRC',      cat: 'transport',   amt: '-₹2,500',  color: '#f87171' },
    { dot: '#f87171', name: 'Netflix',   cat: 'entertainment', amt: '-₹649',  color: '#f87171' },
];

const AI_QUESTIONS = [
    '"How much did I spend on food this month?"',
    '"Compare this month vs last month"',
    '"Create a plan to save ₹10,000"',
    '"Which subscriptions am I paying for?"',
];

// ─── Styles (inline objects to avoid Tailwind dependency issues) ──────────────
const S = {
    page:         { background: '#030712', color: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6, minHeight: '100vh', overflowX: 'hidden' },
    nav:          { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 60px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#030712', position: 'sticky', top: 0, zIndex: 100 },
    navLogo:      { display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    navLinks:     { display: 'flex', alignItems: 'center', gap: 28, fontSize: 14, color: '#9ca3af' },
    navCta:       { background: '#7c3aed', color: '#fff', padding: '9px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none' },
    hero:         { textAlign: 'center', padding: '90px 60px 60px', maxWidth: 900, margin: '0 auto' },
    heroBadge:    { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, marginBottom: 28 },
    h1:           { fontSize: 60, fontWeight: 800, lineHeight: 1.1, marginBottom: 22, letterSpacing: -2 },
    h1Em:         { fontStyle: 'normal', background: 'linear-gradient(135deg,#a78bfa,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    heroSub:      { fontSize: 18, color: '#9ca3af', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.7 },
    heroBtns:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
    btnPrimary:   { background: '#7c3aed', color: '#fff', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', border: 'none' },
    btnSecondary: { background: 'transparent', color: '#e5e7eb', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' },
    section:      { padding: '80px 60px', maxWidth: 1100, margin: '0 auto' },
    sectionLabel: { color: '#7c3aed', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
    sectionTitle: { fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, letterSpacing: -1 },
    sectionSub:   { color: '#9ca3af', fontSize: 16, maxWidth: 520, lineHeight: 1.7, marginBottom: 52 },
    card:         { background: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 28, transition: 'border-color 0.2s, transform 0.2s' },
    featTitle:    { fontSize: 16, fontWeight: 700, marginBottom: 10, color: '#f9fafb' },
    featDesc:     { fontSize: 14, color: '#6b7280', lineHeight: 1.65 },
    featLink:     { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#7c3aed', fontSize: 13, fontWeight: 600, marginTop: 16 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div style={S.page}>
            {/* ── Responsive Overrides injected cleanly ── */}
            <style>{`
                @media (max-width: 768px) {
                    .m-px-60 { padding-left: 20px !important; padding-right: 20px !important; }
                    .m-py-80 { padding-top: 60px !important; padding-bottom: 60px !important; }
                    .m-pt-90 { padding-top: 50px !important; padding-bottom: 40px !important; }
                    .m-hide { display: none !important; }
                    .m-text-60 { font-size: 40px !important; letter-spacing: -1px !important; }
                    .m-text-42 { font-size: 32px !important; }
                    .m-text-36 { font-size: 28px !important; }
                    .m-grid-1 { grid-template-columns: 1fr !important; }
                    .m-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
                    .m-flex-col { flex-direction: column !important; }
                    .m-align-start { align-items: flex-start !important; }
                    .m-gap-24 { gap: 24px !important; }
                    .m-dash-layout { display: flex !important; flex-direction: column !important; padding: 16px !important; }
                    .m-sidebar { display: flex !important; flex-direction: row !important; overflow-x: auto !important; padding-bottom: 10px !important; border-bottom: none !important; white-space: nowrap; margin-bottom: 0 !important; }
                    .m-hero-btns button { width: 100% !important; }
                    .m-footer { justify-content: center !important; text-align: center; }
                }
            `}</style>

            {/* ── Nav ── */}
            <nav style={S.nav} className="m-px-60">
                <div style={S.navLogo}>
                    <IconTrend />
                    TREC
                </div>
                <div style={S.navLinks} className="m-hide">
                    {['Features', 'Analytics', 'AI Assistant', 'Pricing'].map(l => (
                        <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
                           style={{ color: '#9ca3af', textDecoration: 'none' }}>{l}</a>
                    ))}
                </div>
                <button style={S.navCta} onClick={() => navigate('/register')}>
                    Get started free
                </button>
            </nav>

            {/* ── Hero ── */}
            <section style={S.hero} className="m-px-60 m-pt-90">
                <div style={S.heroBadge}>
                    <span style={{ width: 6, height: 6, background: '#7c3aed', borderRadius: '50%' }} />
                    Powered by Gemini AI — now in beta
                </div>
                <h1 style={S.h1} className="m-text-60">
                    The <em style={S.h1Em}>smartest</em> way<br />to track expenses
                </h1>
                <p style={S.heroSub}>
                    TREC gives you full control over your money — with AI that understands
                    your spending, beautiful analytics, and insights that actually help.
                </p>
                <div style={S.heroBtns} className="m-hero-btns">
                    <button style={S.btnPrimary} onClick={() => navigate('/register')}>
                        Start tracking free
                    </button>
                    <button style={S.btnSecondary} onClick={() => navigate('/login')}>
                        Sign in
                    </button>
                </div>
                <p style={{ marginTop: 18, fontSize: 13, color: '#4b5563' }}>
                    No credit card required &nbsp;·&nbsp; Works offline &nbsp;·&nbsp; Your data stays yours
                </p>
            </section>

            {/* ── Dashboard mockup ── */}
            <section id="analytics" style={{ padding: '0 60px 80px', maxWidth: 1100, margin: '0 auto' }} className="m-px-60 m-py-80">
                <div style={{ background: '#0f172a', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, overflow: 'hidden', padding: 28, display: 'grid', gridTemplateColumns: '190px 1fr', gap: 20, minHeight: 380 }} className="m-dash-layout">

                    {/* sidebar */}
                    <div style={{ background: '#111827', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }} className="m-hide">
                            <IconTrend />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb' }}>TREC</span>
                        </div>
                        <div className="m-sidebar">
                            {[{ label: 'Dashboard', active: true }, { label: 'Transactions' }, { label: 'Analytics' }, { label: 'AI Assistant' }, { label: 'Settings' }].map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 4, cursor: 'default', background: item.active ? 'rgba(124,58,237,0.2)' : 'transparent', color: item.active ? '#a78bfa' : '#6b7280', border: item.active ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent' }}>
                                    <div style={{ width: 16, height: 16, background: item.active ? '#7c3aed' : '#374151', borderRadius: 4, flexShrink: 0 }} className="m-hide" />
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* main */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }} className="m-grid-2">
                            {[
                                { label: 'Total Income',   val: '₹65,000',   color: '#34d399', sub: '+12% vs last month' },
                                { label: 'Total Expenses', val: '₹38,246',   color: '#f87171', sub: '↑ 8% vs last month' },
                                { label: 'Net Savings',    val: '₹26,754',   color: '#a78bfa', sub: 'Savings rate 41%' },
                                { label: 'Top Category',   val: 'Rent',      color: '#f9fafb', sub: '₹18,000 this month' },
                            ].map(c => (
                                <div key={c.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{c.label}</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.val}</div>
                                    <div style={{ fontSize: 10, color: c.color === '#f9fafb' ? '#6b7280' : c.color, marginTop: 4, opacity: 0.8 }}>{c.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* chart + tx */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="m-grid-1">
                            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Income vs Expenses — Last 6 months</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                                    {BAR_HEIGHTS.map((b, i) => (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                                            <div style={{ width: '100%', height: `${b.inc}%`, background: i === 5 ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.5)', borderRadius: '4px 4px 0 0' }} />
                                            <div style={{ width: '100%', height: `${b.exp}%`, background: i === 5 ? 'rgba(124,58,237,0.7)' : 'rgba(124,58,237,0.5)', borderRadius: '4px 4px 0 0' }} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                    {[['#34d399','Income'],['#7c3aed','Expense']].map(([bg,label]) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6b7280' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: bg }} />
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Recent transactions</div>
                                {RECENT_TX.map((tx, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: i < RECENT_TX.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tx.dot, flexShrink: 0 }} />
                                        <span style={{ color: '#d1d5db', marginLeft: 8, flex: 1 }}>{tx.name}</span>
                                        <span style={{ color: '#6b7280', fontSize: 11, background: '#1f2937', padding: '2px 8px', borderRadius: 4 }}>{tx.cat}</span>
                                        <span style={{ fontWeight: 600, marginLeft: 10, color: tx.color }}>{tx.amt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trust checks ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, padding: '40px 60px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }} className="m-px-60 m-flex-col m-align-start m-gap-24">
                {CHECKS.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#d1d5db' }}>
                        <div style={{ width: 20, height: 20, background: 'rgba(52,211,153,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: '#34d399', fontWeight: 700 }}>✓</div>
                        {c}
                    </div>
                ))}
            </div>

            {/* ── Features ── */}
            <section id="features" style={S.section} className="m-px-60 m-py-80">
                <div style={S.sectionLabel}>Features</div>
                <h2 style={S.sectionTitle} className="m-text-42">Everything you need<br className="m-hide" />to master your money</h2>
                <p style={S.sectionSub}>Built for individuals who want real clarity — not just spreadsheets.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }} className="m-grid-1">
                    {FEATURES.map((f, i) => (
                        <div key={i} style={S.card}
                             onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                             onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                                {f.icon}
                            </div>
                            <div style={S.featTitle}>{f.title}</div>
                            <div style={S.featDesc}>{f.desc}</div>
                            <div style={S.featLink}>Learn more →</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How it works ── */}
            <section id="how-it-works" style={{ padding: '80px 60px', maxWidth: 1100, margin: '0 auto' }} className="m-px-60 m-py-80">
                <div style={{ textAlign: 'center' }}>
                    <div style={S.sectionLabel}>How it works</div>
                    <h2 style={{ ...S.sectionTitle, textAlign: 'center' }} className="m-text-42">Up and running in minutes</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, position: 'relative', marginTop: 52 }} className="m-grid-1 m-gap-24">
                    <div style={{ position: 'absolute', top: 26, left: 'calc(16.66% + 10px)', right: 'calc(16.66% + 10px)', height: 1, background: 'linear-gradient(90deg,#7c3aed,#6366f1)', zIndex: 0 }} className="m-hide" />
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '0 20px', position: 'relative', zIndex: 1 }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, margin: '0 auto 20px', color: '#fff', boxShadow: '0 0 0 6px rgba(124,58,237,0.15)' }}>
                                {s.n}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── AI section ── */}
            <section id="ai-assistant" style={{ padding: '80px 60px', background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(99,102,241,0.05))', borderTop: '1px solid rgba(124,58,237,0.12)', borderBottom: '1px solid rgba(124,58,237,0.12)' }} className="m-px-60 m-py-80">
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="m-grid-1 m-gap-24">
                    <div>
                        <div style={S.sectionLabel}>AI Assistant</div>
                        <h2 style={{ ...S.sectionTitle, fontSize: 36 }} className="m-text-36">Your personal<br />finance advisor</h2>
                        <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
                            TREC AI reads your real transaction history and gives you answers that
                            actually apply to your life — not generic advice.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {AI_QUESTIONS.map((q, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#d1d5db' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                                    {q}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat mockup */}
                    <div style={{ background: '#0f172a', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { role: 'user', text: 'How much did I spend on food this month?' },
                            { role: 'ai',   text: 'You spent ₹6,240 on food this month across 8 transactions — 16.3% of total expenses.\n\nTop merchants: BigBasket ₹3,240, Zomato ₹2,100, Swiggy ₹900.\n\nTip: Reduce delivery orders to twice a week to save ~₹800/month.' },
                            { role: 'user', text: 'Where can I save ₹5,000 next month?' },
                            { role: 'ai',   text: '3 quick wins:\n1. Cut delivery food → save ₹1,600\n2. Review subscriptions → ₹1,648\n3. Metro vs Uber → ₹1,800 saved\n\nTotal potential: ₹5,048' },
                        ].map((m, i) => (
                            <div key={i} style={{
                                padding: '12px 16px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxWidth: '85%',
                                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                background: m.role === 'user' ? 'rgba(124,58,237,0.2)' : '#1e293b',
                                color: m.role === 'user' ? '#e9d5ff' : '#d1d5db',
                                border: m.role === 'ai' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                            }}>
                                {m.text}
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <input readOnly placeholder="Ask anything about your finances..." style={{ flex: 1, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#9ca3af', fontSize: 12, outline: 'none' }} />
                            <button onClick={() => navigate('/login')} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Ask</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" style={{ ...S.section, textAlign: 'center' }} className="m-px-60 m-py-80">
                <div style={S.sectionLabel}>Pricing</div>
                <h2 style={S.sectionTitle} className="m-text-42">Simple, honest pricing</h2>
                <p style={{ color: '#9ca3af', fontSize: 16, maxWidth: 440, margin: '0 auto' }}>Start for free. Self-host forever. Upgrade when you need AI at scale.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 52, textAlign: 'left' }} className="m-grid-1">
                    {PLANS.map((p, i) => (
                        <div key={i} style={{ background: '#0f172a', border: p.featured ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 30, position: 'relative', ...(p.featured && { background: 'rgba(124,58,237,0.08)' }) }}>
                            {p.featured && (
                                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                                    Most popular
                                </div>
                            )}
                            <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.name}</div>
                            <div style={{ fontSize: 40, fontWeight: 800, color: '#f9fafb', marginBottom: 6 }}>
                                {p.price} <span style={{ fontSize: 16, fontWeight: 400, color: '#6b7280' }}>{p.sub}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{p.desc}</div>
                            {p.features.map((f, j) => (
                                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#d1d5db', marginBottom: 10 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                                    {f}
                                </div>
                            ))}
                            <button
                                onClick={() => navigate('/register')}
                                style={{ display: 'block', width: '100%', textAlign: 'center', padding: 11, borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 24, cursor: 'pointer', ...(p.featured ? { background: '#7c3aed', color: '#fff', border: 'none' } : { background: 'transparent', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.15)' }) }}>
                                {p.featured ? 'Start Pro trial' : p.name === 'Enterprise' ? 'Contact us' : 'Get started free'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ textAlign: 'center', padding: '100px 60px', background: 'radial-gradient(ellipse 60% 50% at 50% 100%,rgba(124,58,237,0.18),transparent)' }} className="m-px-60 m-py-80">
                <h2 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, letterSpacing: -1.5 }} className="m-text-42">
                    Start tracking <em style={S.h1Em}>smarter</em> today
                </h2>
                <p style={{ color: '#9ca3af', fontSize: 16, marginBottom: 36 }}>
                    Join thousands who have clarity over their finances. Free forever.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }} className="m-hero-btns">
                    <button style={S.btnPrimary} onClick={() => navigate('/register')}>
                        Get started — it's free
                    </button>
                    <button style={S.btnSecondary} onClick={() => navigate('/login')}>
                        Sign in to your account
                    </button>
                </div>
                <p style={{ marginTop: 16, fontSize: 12, color: '#4b5563' }}>
                    By signing up you agree to our Terms of Service and Privacy Policy
                </p>
            </section>

            {/* ── Footer ── */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }} className="m-px-60 m-flex-col m-footer">
                <div style={{ ...S.navLogo }}>TREC</div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6b7280', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Features', 'Docs', 'Privacy', 'Terms', 'GitHub'].map(l => (
                        <a key={l} href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>{l}</a>
                    ))}
                </div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>© 2026 TREC. Built with FastAPI + React.</div>
            </footer>

        </div>
    );
}