import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center p-6">
      <div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
          <TrendingUp size={28} className="text-white" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-3">404</h1>
        <p className="text-gray-400 mb-6">This page doesn't exist</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
