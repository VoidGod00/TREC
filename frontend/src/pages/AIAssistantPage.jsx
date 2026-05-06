import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Lightbulb, RefreshCw, Mic, MicOff, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { aiApi } from '../services/api';
import { Button, Card } from '../components/common';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const QUICK_QUESTIONS = [
    "How much did I spend on food this month?",
    "Compare this month vs last month",
    "Where can I save money?",
    "What are my top 3 expenses?",
    "Create a savings plan for ₹10,000",
    "Am I overspending on any category?",
];

function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={clsx('flex gap-2 sm:gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
            <div className={clsx(
                'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                isUser ? 'bg-violet-600' : 'bg-indigo-600'
            )}>
                {isUser ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={clsx(
                'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                isUser
                    ? 'bg-violet-600 text-white rounded-tr-sm'
                    : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'
            )}>
                {msg.content}
                {msg.timestamp && (
                    <p className="text-[10px] sm:text-xs opacity-50 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your TREC AI financial assistant 🤖\n\nI can help you analyze your spending, track budgets, and give personalized savings advice based on your actual transaction data.\n\nWhat would you like to know?",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // UI State
    const [inputMode, setInputMode] = useState('text'); // 'text' | 'voice'
    const [isListening, setIsListening] = useState(false);
    const [recognitionInstance, setRecognitionInstance] = useState(null);

    // Mute State
    const [isMuted, setIsMuted] = useState(true);
    const isMutedRef = useRef(isMuted);

    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // ─── Auto-Unmute in Voice Mode ────────────────────────────────────────────
    useEffect(() => {
        if (inputMode === 'voice' && isMuted) {
            setIsMuted(false);
            toast('AI Voice Unmuted for Voice Mode', { icon: '🔊', style: { background: '#333', color: '#fff' } });
        }
    }, [inputMode]);

    // ─── Voice Helpers ────────────────────────────────────────────────────────
    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        if (newMutedState) {
            window.speechSynthesis.cancel();
            toast('AI Voice Muted', { icon: '🔇', style: { background: '#333', color: '#fff' } });
        } else {
            toast('AI Voice Unmuted', { icon: '🔊', style: { background: '#333', color: '#fff' } });
        }
    };

    const speak = (text) => {
        window.speechSynthesis.cancel();
        if (isMutedRef.current) return;

        const cleanText = text.replace(/[*#_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    };

    const toggleVoiceCapture = () => {
        if (isListening && recognitionInstance) {
            recognitionInstance.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Browser doesn't support speech recognition.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            sendMessage(transcript);
        };
        recognition.onerror = () => setIsListening(false);

        setRecognitionInstance(recognition);
        recognition.start();
    };

    useEffect(() => {
        if (inputMode === 'text' && isListening && recognitionInstance) {
            recognitionInstance.stop();
            setIsListening(false);
        }
    }, [inputMode, isListening, recognitionInstance]);

    // ─── Core Actions ──────────────────────────────────────────────────────────
    const sendMessage = async (question) => {
        const q = question || input.trim();
        if (!q || loading) return;

        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: q }]);
        setLoading(true);

        try {
            const { data } = await aiApi.ask(q);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.answer, timestamp: data.timestamp },
            ]);
            speak(data.answer);
        } catch (err) {
            toast.error('Failed to get AI response');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const loadInsights = async () => {
        setInsightsLoading(true);
        try {
            const { data } = await aiApi.insights();
            setInsights(data.insights);
        } catch {
            toast.error('Failed to load insights');
        } finally {
            setInsightsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: "Chat cleared! How can I help you with your finances today?",
        }]);
    };

    return (
        <div className="space-y-4 sm:space-y-6 h-full flex flex-col p-2 sm:p-0">
            <style>{`
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .animate-mic-pulse { animation: pulse-red 1.5s infinite; }
                /* Hide scrollbar for mobile horizontal scrolling */
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <Bot size={24} className="text-violet-400" /> AI Assistant
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">Chat or talk with your financial guide</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={toggleMute}
                        className={isMuted ? "text-red-400" : "text-emerald-400"}
                        title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={clearChat}>
                        <RefreshCw size={14} /> Clear
                    </Button>
                    <Button variant="secondary" size="sm" onClick={loadInsights} loading={insightsLoading}>
                        <Lightbulb size={14} /> Get Insights
                    </Button>
                </div>
            </div>

            {/* Mobile-only Quick Questions Carousel */}
            <div className="flex lg:hidden overflow-x-auto gap-2 pb-1 hide-scrollbar shrink-0">
                {QUICK_QUESTIONS.map((q) => (
                    <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        disabled={loading}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors border border-gray-700"
                    >
                        {q}
                    </button>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0">
                <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">

                    {/* Mobile-only Insights Display */}
                    {insights && (
                        <div className="lg:hidden mx-4 mt-4 p-3 bg-gray-800/80 border border-violet-500/30 rounded-xl flex items-start gap-2 animate-in slide-in-from-top-2">
                            <Sparkles size={14} className="text-violet-400 shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{insights}</p>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                        {loading && (
                            <div className="flex gap-3">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Bot size={14} /></div>
                                <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                                    <div className="flex gap-1.5 items-center">
                                        {[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="p-3 sm:p-4 border-t border-gray-800 flex flex-col gap-3 sm:gap-4 bg-gray-900/50">
                        <div className="flex justify-center">
                            <div className="relative flex bg-gray-950 p-1 rounded-full border border-gray-800 shadow-inner">
                                <div
                                    className={clsx(
                                        "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-800 rounded-full transition-transform duration-300 ease-out shadow-sm",
                                        inputMode === 'voice' ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                                    )}
                                />
                                <button
                                    onClick={() => setInputMode('text')}
                                    className={clsx(
                                        "relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 w-20 sm:w-24 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors",
                                        inputMode === 'text' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                    )}
                                >
                                    <MessageSquare size={14} /> Text
                                </button>
                                <button
                                    onClick={() => setInputMode('voice')}
                                    className={clsx(
                                        "relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 w-20 sm:w-24 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors",
                                        inputMode === 'voice' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                    )}
                                >
                                    <Mic size={14} /> Voice
                                </button>
                            </div>
                        </div>

                        {inputMode === 'text' ? (
                            <div className="flex gap-2 sm:gap-3 transition-opacity animate-in fade-in">
                                <input
                                    className="flex-1 px-3 sm:px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-base sm:text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                    placeholder="Ask about your finances..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                    disabled={loading}
                                />
                                <Button onClick={() => sendMessage()} loading={loading} disabled={!input.trim()}>
                                    <Send size={16} />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-2 gap-3 transition-opacity animate-in fade-in">
                                <button
                                    onClick={toggleVoiceCapture}
                                    disabled={loading}
                                    className={clsx(
                                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                                        isListening
                                            ? "bg-red-500 text-white animate-mic-pulse scale-110"
                                            : "bg-gray-800 text-gray-400 hover:text-violet-400 hover:bg-gray-700 border border-gray-700"
                                    )}
                                >
                                    {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                                </button>
                                <p className={clsx(
                                    "text-xs sm:text-sm font-medium transition-colors",
                                    isListening ? "text-red-400" : "text-gray-500"
                                )}>
                                    {isListening ? "Listening... Tap to stop" : "Tap the mic to speak"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Sidebar */}
                <div className="w-72 shrink-0 space-y-4 overflow-y-auto hidden lg:block">
                    <Card title="Quick Questions">
                        <div className="space-y-2">
                            {QUICK_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => sendMessage(q)}
                                    disabled={loading}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-all border border-transparent hover:border-violet-500/30"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {insights && (
                        <Card title="AI Insights">
                            <div className="flex items-start gap-2 animate-in slide-in-from-bottom-2">
                                <Sparkles size={14} className="text-violet-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{insights}</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}