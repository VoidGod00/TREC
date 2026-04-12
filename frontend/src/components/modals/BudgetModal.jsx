import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal, Button, Input, Select } from '../common';
import { closeModal } from '../../store/slices/uiSlice';
import { fetchDashboard } from '../../store/slices/analyticsSlice';
import { api } from '../../services/api'; // Ensure this path is 100% correct

const CATEGORIES = [
    { value: '', label: 'Select a category...' },
    ...['food','transport','rent','utilities','entertainment','healthcare',
        'shopping','travel','education','savings','other']
        .map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
];

const schema = z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Valid amount required')
        .refine(v => parseFloat(v) > 0, 'Amount must be greater than 0'),
});

export default function BudgetModal() {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);

    // Destructure 'modal' from UI slice
    const { modal } = useSelector((s) => s.ui);
    const { selectedYear, selectedMonth } = useSelector((s) => s.analytics);

    const isOpen = modal?.type === 'MANAGE_BUDGET';

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { category: '', amount: '' },
    });

    useEffect(() => {
        if (isOpen) reset();
    }, [isOpen, reset]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // Hits your @router.post("/budgets") endpoint
            await api.post('/analytics/budgets', {
                category: data.category,
                limit_amount: parseFloat(data.amount),
                month: selectedMonth,
                year: selectedYear,
            });

            toast.success(`Budget for ${data.category} updated!`);

            // Re-fetches the dashboard data to update progress bars
            dispatch(fetchDashboard({ year: selectedYear, month: selectedMonth }));
            dispatch(closeModal());
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to set budget');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={() => dispatch(closeModal())} title="Set Monthly Budget">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <p className="text-sm text-gray-400">
                    Set limit for {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
                </p>

                <Select label="Category" options={CATEGORIES} error={errors.category?.message} {...register('category')} />
                <Input label="Limit (₹)" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />

                <div className="flex gap-3 pt-4 border-t border-gray-800">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => dispatch(closeModal())}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-violet-600" loading={loading}>Save Budget</Button>
                </div>
            </form>
        </Modal>
    );
}