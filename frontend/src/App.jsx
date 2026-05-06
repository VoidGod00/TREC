import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { fetchCurrentUser } from './store/slices/authSlice';

// Pages & Components
import Layout from './components/layout/Layout';
import LandingPage from './pages/Landingpage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ReceiptScannerPage from "./pages/ReceiptScannerPage";
import CrystalBallPage from "./pages/CrystalBallPage";
import HealthScorePage from "./pages/HealthScorePage";

// Helper Route Components
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useSelector((s) => s.auth);
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated } = useSelector((s) => s.auth);
    return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Main App Component
export default function App() {
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((s) => s.auth);
    const { theme } = useSelector((s) => s.ui);

    useEffect(() => {
        if (isAuthenticated) dispatch(fetchCurrentUser());
    }, [isAuthenticated, dispatch]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    return (
        <div className={theme === 'dark' ? 'dark' : ''}>
            <Router>
                <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
                <Routes>
                    {/* Public Landing Page */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Guest Only Routes */}
                    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

                    {/* Authenticated Routes */}
                    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="transactions" element={<TransactionsPage />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="ai-assistant" element={<AIAssistantPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="/receipts/scan" element={<ReceiptScannerPage />} />
                        <Route path="/forecast" element={<CrystalBallPage />} />
                        <Route path="/health-score" element={<HealthScorePage />} />
                    </Route>

                    {/* 404 Catch-all */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Router>
        </div>
    );
}