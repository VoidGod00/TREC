import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
    fetchTransactions, deleteTransaction, setFilters
} from '../store/slices/transactionSlice';
import { openModal } from '../store/slices/uiSlice'; // <-- Added this
import {
    Button, Badge, Card, EmptyState, LoadingSpinner
} from '../components/common';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, Edit3, Search, Filter,
    ArrowUpCircle, ArrowDownCircle, ArrowLeftRight
} from 'lucide-react';

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    ...['food','transport','rent','utilities','entertainment','healthcare',
        'shopping','travel','education','savings','salary','freelance','investment','other']
        .map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
];

const formatINR = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

export default function TransactionsPage() {
    const dispatch = useDispatch();
    const { items, total, totalPages, loading, filters } = useSelector((s) => s.transactions);

    // Local state for filters
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        dispatch(fetchTransactions(filters));
    }, [dispatch, filters]);

    // Trigger global modal for creation
    const openCreate = () => {
        dispatch(openModal({ type: 'ADD_TRANSACTION' }));
    };

    // Trigger global modal for editing
    const openEdit = (tx) => {
        dispatch(openModal({ type: 'EDIT_TRANSACTION', data: tx }));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        const res = await dispatch(deleteTransaction(id));
        if (deleteTransaction.fulfilled.match(res)) toast.success('Deleted');
    };

    const applySearch = () => {
        dispatch(setFilters({ search, type: selectedType || undefined, category: selectedCategory || undefined }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Transactions</h1>
                    <p className="text-gray-400 text-sm mt-1">{total} total transactions</p>
                </div>
                <Button onClick={openCreate} size="md">
                    <Plus size={16} /> Add Transaction
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-48 relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="Search transactions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        />
                    </div>
                    <select
                        className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>
                    <select
                        className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <Button onClick={applySearch} variant="secondary" size="md">
                        <Filter size={15} /> Apply
                    </Button>
                </div>
            </Card>

            {/* Table */}
            <Card className="min-h-[500px]">
                {loading ? (
                    <div className="flex justify-center py-12"><LoadingSpinner /></div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={ArrowLeftRight}
                        title="No transactions yet"
                        description="Add your first transaction to get started tracking your finances."
                        action={<Button onClick={openCreate}><Plus size={16} /> Add Transaction</Button>}
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-gray-800">
                                    {['Date','Type','Category','Amount','Merchant/Note','Recurring','Actions'].map((h) => (
                                        <th key={h} className="text-left py-3 px-3 text-gray-400 font-medium text-xs uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                {items.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors group">
                                        <td className="py-3 px-3 text-gray-300">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                                        <td className="py-3 px-3">
                                            <Badge variant={tx.type === 'income' ? 'income' : 'expense'}>
                                                {tx.type === 'income' ? <ArrowUpCircle size={10} className="inline mr-1" /> : <ArrowDownCircle size={10} className="inline mr-1" />}
                                                {tx.type}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-3">
                                            <Badge variant="default">{tx.category}</Badge>
                                        </td>
                                        <td className={`py-3 px-3 font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                                        </td>
                                        <td className="py-3 px-3 text-gray-400 max-w-xs truncate">
                                            {tx.merchant || tx.note || '—'}
                                        </td>
                                        <td className="py-3 px-3">
                                            {tx.is_recurring && <Badge variant="violet">Recurring</Badge>}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(tx)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-violet-400 transition-colors">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                                <p className="text-sm text-gray-500">Page {filters.page || 1} of {totalPages}</p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={(filters.page || 1) === 1}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            dispatch(setFilters({ page: (filters.page || 1) - 1 }));
                                        }}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={(filters.page || 1) >= totalPages}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            dispatch(setFilters({ page: (filters.page || 1) + 1 }));
                                        }}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}