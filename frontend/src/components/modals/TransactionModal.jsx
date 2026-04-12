import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { Modal, Button, Input, Select } from '../common';
import { closeModal } from '../../store/slices/uiSlice';
import { createTransaction, updateTransaction, fetchTransactions } from '../../store/slices/transactionSlice';
import { fetchDashboard } from '../../store/slices/analyticsSlice';

const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'refund', 'other']
    .map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

const EXPENSE_CATEGORIES = ['food', 'transport', 'rent', 'utilities', 'entertainment', 'healthcare', 'shopping', 'travel', 'education', 'savings', 'other']
    .map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

const schema = z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid amount required').refine(v => parseFloat(v) > 0, 'Must be positive'),
    category: z.string().min(1, 'Required'),
    type: z.enum(['income', 'expense']),
    date: z.string().min(1, 'Required'),
    note: z.string().optional(),
    merchant: z.string().optional(),
    is_recurring: z.boolean().optional(),
});

export default function TransactionModal() {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);

    // Grabbing the current viewed period from Redux
    const { selectedYear, selectedMonth } = useSelector((s) => s.analytics);

    const { type, data: editingTx } = useSelector((s) => s.ui.modal || {});
    const isOpen = type === 'ADD_TRANSACTION' || type === 'EDIT_TRANSACTION';

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { type: 'expense', is_recurring: false },
    });

    const selectedType = watch('type');
    const currentCategory = watch('category');
    const activeCategories = selectedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const categoryOptions = [{ value: '', label: 'Select Category...' }, ...activeCategories];

    useEffect(() => {
        if (currentCategory && !activeCategories.find(c => c.value === currentCategory)) {
            setValue('category', '');
        }
    }, [selectedType, currentCategory, activeCategories, setValue]);

    useEffect(() => {
        if (isOpen) {
            if (editingTx) {
                reset({
                    amount: String(editingTx.amount),
                    category: editingTx.category,
                    type: editingTx.type,
                    date: format(new Date(editingTx.date), "yyyy-MM-dd'T'HH:mm"),
                    note: editingTx.note || '',
                    merchant: editingTx.merchant || '',
                    is_recurring: editingTx.is_recurring,
                });
            } else {
                reset({
                    type: 'expense',
                    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                    is_recurring: false,
                    amount: '',
                    category: '',
                    merchant: '',
                    note: ''
                });
            }
        }
    }, [isOpen, editingTx, reset]);

    // ─── THE FIX IS HERE ───────────────────────────────────────────────────
    const refreshAppData = () => {
        dispatch(fetchTransactions());
        dispatch(fetchDashboard({
            year: selectedYear,
            month: selectedMonth
        }));
    };
    // ───────────────────────────────────────────────────────────────────────

    const onSubmit = async (data) => {
        setLoading(true);
        const payload = { ...data, amount: parseFloat(data.amount) };

        try {
            if (editingTx) {
                const res = await dispatch(updateTransaction({ id: editingTx.id, data: payload }));
                if (updateTransaction.fulfilled.match(res)) {
                    toast.success('Transaction updated');
                    refreshAppData();
                    dispatch(closeModal());
                }
            } else {
                const res = await dispatch(createTransaction(payload));
                if (createTransaction.fulfilled.match(res)) {
                    toast.success('Transaction added');
                    refreshAppData();
                    dispatch(closeModal());
                }
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={() => dispatch(closeModal())}
            title={editingTx ? 'Edit Transaction' : 'Add Transaction'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Amount (₹)"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        error={errors.amount?.message}
                        {...register('amount')}
                    />
                    <Select
                        label="Type"
                        options={[{value:'expense',label:'Expense'},{value:'income',label:'Income'}]}
                        error={errors.type?.message}
                        {...register('type')}
                    />
                </div>

                <Select
                    label="Category"
                    options={categoryOptions}
                    error={errors.category?.message}
                    {...register('category')}
                />

                <Input
                    label="Date"
                    type="datetime-local"
                    error={errors.date?.message}
                    {...register('date')}
                />

                <Input
                    label="Merchant"
                    placeholder="e.g. Swiggy, Amazon"
                    {...register('merchant')}
                />

                <Input
                    label="Note"
                    placeholder="Optional note"
                    {...register('note')}
                />

                <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-violet-500 bg-gray-800 border-gray-700"
                        {...register('is_recurring')}
                    />
                    <span className="text-sm text-gray-300">Mark as recurring</span>
                </label>

                <div className="flex gap-3 pt-4 border-t border-gray-800">
                    <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => dispatch(closeModal())}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-violet-600 hover:bg-violet-700"
                        loading={loading}
                    >
                        {editingTx ? 'Update' : 'Add'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}