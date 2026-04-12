import React, { forwardRef } from 'react';
import clsx from 'clsx';

// ─── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-gray-700 border-t-violet-500', sizes[size], className)} />
  );
}

export default LoadingSpinner;

// ─── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'violet' }) {
  const colors = {
    violet: 'from-violet-500/10 to-indigo-500/10 border-violet-500/20',
    green:  'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    red:    'from-red-500/10 to-rose-500/10 border-red-500/20',
    amber:  'from-amber-500/10 to-orange-500/10 border-amber-500/20',
  };
  const iconColors = {
    violet: 'bg-violet-500/20 text-violet-400',
    green:  'bg-emerald-500/20 text-emerald-400',
    red:    'bg-red-500/20 text-red-400',
    amber:  'bg-amber-500/20 text-amber-400',
  };
  return (
    <div className={clsx('rounded-xl border bg-gradient-to-br p-5', colors[color])}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        {Icon && (
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', iconColors[color])}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      {trend !== undefined && (
        <p className={clsx('text-xs mt-1 font-medium', trend >= 0 ? 'text-red-400' : 'text-emerald-400')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-violet-600 hover:bg-violet-500 text-white focus:ring-violet-500',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 focus:ring-gray-600',
    danger:    'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    ghost:     'text-gray-400 hover:text-white hover:bg-gray-800 focus:ring-gray-700',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={loading} {...props}>
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
      
      <input
        ref={ref}   // ✅ THIS IS THE FIX
        className={clsx(
          'w-full px-3 py-2 rounded-lg bg-gray-800 border text-white placeholder-gray-500 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all',
          error ? 'border-red-500' : 'border-gray-700',
          className
        )}
        {...props}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

// ─── Select ───────────────────────────────────────────────────────────────────
// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = forwardRef(({ label, error, options = [], className = '', ...props }, ref) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
      <select
        ref={ref}  // ✅ ADDED REF HERE
        className={clsx(
          'w-full px-3 py-2 rounded-lg bg-gray-800 border text-white text-sm',
          'focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all',
          error ? 'border-red-500' : 'border-gray-700',
          className
        )}
        {...props}
      >
        {/* Added a default disabled option so it doesn't auto-select the first valid item without user intent */}
        <option value="" disabled>Select...</option> 
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

// // Optional but good for debugging in React DevTools
// Select.displayName = 'Select';

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  const variants = {
    default:  'bg-gray-700 text-gray-300',
    income:   'bg-emerald-500/20 text-emerald-400',
    expense:  'bg-red-500/20 text-red-400',
    warning:  'bg-amber-500/20 text-amber-400',
    violet:   'bg-violet-500/20 text-violet-400',
  };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', title }) {
  return (
    <div className={clsx('bg-gray-900 border border-gray-800 rounded-xl', className)}>
      {title && (
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-500" />
        </div>
      )}
      <p className="text-lg font-semibold text-white mb-1">{title}</p>
      <p className="text-sm text-gray-500 mb-5 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
