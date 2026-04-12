// ─── AnalyticsPage ────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard, setSelectedPeriod } from '../store/slices/analyticsSlice';
import { Card, LoadingSpinner } from '../components/common';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, Legend
} from 'recharts';

const formatINR = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function AnalyticsPage() {
  const dispatch = useDispatch();
  const { dashboard, loading, selectedYear, selectedMonth } = useSelector((s) => s.analytics);

  useEffect(() => {
    dispatch(fetchDashboard({ year: selectedYear, month: selectedMonth }));
  }, [dispatch, selectedYear, selectedMonth]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const d = dashboard;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="flex gap-3">
          <select
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm"
            value={selectedMonth}
            onChange={(e) => dispatch(setSelectedPeriod({ year: selectedYear, month: Number(e.target.value) }))}
          >
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm"
            value={selectedYear}
            onChange={(e) => dispatch(setSelectedPeriod({ year: Number(e.target.value), month: selectedMonth }))}
          >
            {[2023,2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Monthly Income vs Expense">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d?.monthly_trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[4,4,0,0]} />
              <Bar dataKey="expense" fill="#8b5cf6" name="Expense" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Net Savings Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={d?.monthly_trends || []}>
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              <Area type="monotone" dataKey="net" stroke="#8b5cf6" fill="url(#savingsGrad)" strokeWidth={2} name="Net Savings" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Category Spending Breakdown">
          {d?.category_breakdown?.length ? (
            <div className="space-y-3">
              {d.category_breakdown.map((cat, i) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize font-medium">{cat.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">{cat.count} transactions</span>
                      <span className="text-white font-semibold">{formatINR(cat.amount)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${cat.percentage}%`,
                        background: `hsl(${(i * 47) % 360}, 70%, 60%)`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 text-right">{cat.percentage}% of total</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No expense data for this month</p>
          )}
        </Card>

        <Card title="Budget vs Actual">
          {d?.budget_status?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.budget_status} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Bar dataKey="budget" fill="#374151" name="Budget" radius={[0,4,4,0]} />
                <Bar dataKey="spent" fill="#8b5cf6" name="Spent" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Set budgets to see this chart</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsPage;
