import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    LayoutDashboard, ArrowLeftRight, BarChart3, Bot,
    Settings, LogOut, Menu, X, TrendingUp, Bell, Receipt, Sparkles, HeartPulse
} from 'lucide-react';
import { logoutUser } from '../../store/slices/authSlice';
import { toggleSidebar } from '../../store/slices/uiSlice';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Import your modals here
import TransactionModal from '../modals/TransactionModal';
import BudgetModal from '../modals/BudgetModal';

const NAV_ITEMS = [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
    { to: '/receipts/scan',icon: Receipt,         label: 'Receipt Scanner' },
    { to: '/analytics',    icon: BarChart3,       label: 'Analytics' },
    { to: '/forecast',     icon: Sparkles,        label: 'Crystal Ball' },
    { to: '/health-score', icon: HeartPulse,      label: 'Health Score' },
    { to: '/ai-assistant', icon: Bot,             label: 'AI Assistant' },
    { to: '/settings',     icon: Settings,        label: 'Settings' },
];

export default function Layout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { sidebarOpen } = useSelector((s) => s.ui);
    const { user } = useSelector((s) => s.auth);

    const handleLogout = async () => {
        await dispatch(logoutUser());
        toast.success('Logged out successfully');
        navigate('/login');
    };

    // Auto-close sidebar on mobile when a link is clicked
    const handleNavClick = () => {
        if (window.innerWidth < 768 && sidebarOpen) {
            dispatch(toggleSidebar());
        }
    };

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden relative">

            {/* Mobile Backdrop Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => dispatch(toggleSidebar())}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                'flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 h-full shrink-0',
                // Mobile layout: Absolute positioned, slides in/out from the left
                'absolute z-50 w-64',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                // Desktop layout (md and up): Relative positioned, resizes instead of translating
                'md:relative md:translate-x-0',
                sidebarOpen ? 'md:w-64' : 'md:w-16'
            )}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={16} className="text-white" />
                    </div>
                    {sidebarOpen && (
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                            TREC
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={handleNavClick}
                            className={({ isActive }) => clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
                                isActive
                                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )}
                        >
                            <Icon size={18} className="shrink-0" />
                            {sidebarOpen && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* User + Logout */}
                {sidebarOpen && user && (
                    <div className="p-4 border-t border-gray-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
                                {user.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                {/* Topbar */}
                <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur shrink-0">
                    <button
                        onClick={() => dispatch(toggleSidebar())}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-3">
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all relative">
                            <Bell size={20} />
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-violet-500 rounded-full" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>

            {/* ─── Global Modals Mounted Here ─── */}
            <TransactionModal />
            <BudgetModal />

        </div>
    );
}