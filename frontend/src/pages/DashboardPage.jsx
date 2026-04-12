import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertTriangle, Plus } from 'lucide-react';
import { fetchDashboard } from '../store/slices/analyticsSlice';
import { fetchTransactions } from '../store/slices/transactionSlice';
import { openModal } from '../store/slices/uiSlice';
import { StatCard, Card, LoadingSpinner, Button } from '../components/common';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

const formatCurrency = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm z-50">
            <p className="text-gray-400 mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: p.color }} className="font-medium">
                    {p.name}: {formatCurrency(p.value)}
                </p>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const dispatch = useDispatch();
    const { dashboard, loading: analyticsLoading, selectedYear, selectedMonth } = useSelector((s) => s.analytics);
    const { items: transactions, loading: txLoading } = useSelector((s) => s.transactions);
    const { user } = useSelector((s) => s.auth);

    useEffect(() => {
        dispatch(fetchDashboard({ year: selectedYear, month: selectedMonth }));
        dispatch(fetchTransactions({ limit: 5 })); // Fetch recent transactions
    }, [dispatch, selectedYear, selectedMonth]);

    const handleAddTransaction = () => {
        dispatch(openModal({ type: 'ADD_TRANSACTION' }));
    };

    const handleManageBudgets = () => {
        // Triggers a modal for budget management (ensure this type exists in your uiSlice)
        dispatch(openModal({ type: 'MANAGE_BUDGET' }));
    };

    if (analyticsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const d = dashboard;
    // Get only the 5 most recent transactions
    const recentTransactions = transactions?.slice(0, 5) || [];

    return (
        <div className="space-y-6">
            {/* ─── Header ────────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/40 p-5 rounded-2xl border border-gray-800/50">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Welcome back, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Overview for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                </div>

                <Button
                    onClick={handleAddTransaction}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/10 active:scale-95"
                >
                    <Plus size={18} />
                    <span className="font-semibold">Add Transaction</span>
                </Button>
            </div>

            {/* ─── Budget Alerts ─────────────────────────────────────────────────── */}
            {d?.budget_status?.some((b) => b.is_over_budget) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-400 font-medium text-sm">Budget Alert</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                            You've exceeded your budget in:{' '}
                            {d.budget_status.filter((b) => b.is_over_budget).map((b) => b.category).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* ─── Stat Cards ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard title="Total Income" value={formatCurrency(d?.total_income || 0)} icon={TrendingUp} color="green" />
                <StatCard title="Total Expenses" value={formatCurrency(d?.total_expense || 0)} icon={TrendingDown} color="red" trend={d?.month_over_month_change} />
                <StatCard title="Net Savings" value={formatCurrency(d?.net_savings || 0)} icon={PiggyBank} color="violet" />
                <StatCard title="Savings Rate" value={`${d?.savings_rate || 0}%`} icon={Wallet} color="amber" subtitle={`Top spend: ${d?.top_expense_category || 'N/A'}`} />
            </div>

            {/* ─── Charts Row 1: Recent Tx, Category Pie, Budget Status ─────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Recent Transactions */}
                <Card title="Recent Transactions" className="xl:col-span-1">
                    {txLoading && recentTransactions.length === 0 ? (
                        <div className="flex justify-center py-10"><LoadingSpinner /></div>
                    ) : recentTransactions.length > 0 ? (
                        <div className="space-y-3 mt-2">
                            {recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:bg-gray-800/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {tx.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium text-white truncate w-32 sm:w-40">{tx.merchant || tx.category}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-semibold shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-8">No recent transactions</p>
                    )}
                </Card>

                {/* Category Pie */}
                <Card title="Spending by Category" className="xl:col-span-1">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={(d?.category_breakdown || []).map(item => ({
                                    ...item,
                                    safeAmount: Number(item.amount || item.total || item.value || item.spent || 0)
                                }))}
                                cx="50%" cy="50%"
                                innerRadius={55} outerRadius={80}
                                dataKey="safeAmount"
                                nameKey="category"
                                paddingAngle={4}
                            >
                                {(d?.category_breakdown || []).map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                        {(d?.category_breakdown || []).slice(0, 4).map((cat, i) => (
                            <div key={cat.category} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                    <span className="text-gray-400 capitalize">{cat.category}</span>
                                </div>
                                <span className="text-white font-medium">{cat.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Budget Status with Buttons */}
                <Card title="Budget Status" className="xl:col-span-1 flex flex-col">
                    {d?.budget_status?.length ? (
                        <div className="flex flex-col h-full justify-between">
                            <div className="space-y-4 mt-2">
                                {d.budget_status.map((b) => (
                                    <div key={b.category}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="text-gray-300 capitalize font-medium">{b.category}</span>
                                            <span className={b.is_over_budget ? 'text-red-400 font-medium' : 'text-gray-400'}>
                        {formatCurrency(b.spent)} <span className="text-gray-600 font-normal">/ {formatCurrency(b.budget)}</span>
                      </span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${b.is_over_budget ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]'}`}
                                                style={{ width: `${Math.min(b.percentage_used, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button
                                onClick={handleManageBudgets}
                                variant="secondary"
                                className="w-full mt-6 text-xs bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                            >
                                Manage Budgets
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4 h-full">
                            <p className="text-gray-500 text-sm text-center">No budgets set for this month</p>
                            <Button onClick={handleManageBudgets} size="sm" className="bg-violet-600 hover:bg-violet-700">
                                <Plus size={14} className="mr-1 inline" />
                                Set a Budget
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* ─── Charts Row 2: Income vs Expenses & Savings Trend ─────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Monthly Trend */}
                <Card title="Income vs Expenses (6 Months)" className="xl:col-span-2">
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={d?.monthly_trends || []} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: '10px' }} />
                            <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="#8b5cf6" name="Expense" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Savings Trend */}
                <Card title="Net Savings Trend" className="xl:col-span-1">
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={d?.monthly_trends || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#030712' }} activeDot={{ r: 6 }} name="Net Savings" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>

        </div>
    );
}