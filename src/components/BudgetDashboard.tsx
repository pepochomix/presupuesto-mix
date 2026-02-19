"use client";

import React, { useState, useMemo, useEffect } from "react";
import { budgetData, Dish, Ingredient, HISTORIC_DATA } from "@/data/budgetData";
import { INITIAL_PARTICIPANTS, Participant } from "@/data/participants";
import { INITIAL_COW_FUNDS, CowFundItem } from "@/data/cowFundData";
import {
    Calculator,
    ShoppingCart,
    TrendingDown,
    Users,
    ChevronDown,
    ChevronUp,
    Store,
    Sparkles,
    ArrowRight,
    TrendingUp,
    ArrowLeft,
    Loader2,
    Send,
    Plus,
    MessageSquare,
    User,
    UserCheck,
    UserMinus,
    Baby,
    X,
    Check,
    Gift,
    PiggyBank,
    Coins,
    AlertTriangle,
    Leaf,
    ChefHat,
    Mic,
    MicOff,
    CheckCircle2
} from "lucide-react";
import { saveFailedItem, getFailedItems, clearFailedItems, saveCowFunds, getCowFunds, clearCowFundsData } from "@/app/db";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    AreaChart, Area, CartesianGrid, Legend, ComposedChart, Line
} from 'recharts';
import { optimizeBudgetWithAI, generateMenuAction, parseVoiceCommand } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_PEOPLE_COUNT = 10;
const APP_VERSION = '1.0.2'; // Increment this to force update

export default function BudgetDashboard() {
    // Force Cache Busting on Version Change
    useEffect(() => {
        const storedVersion = localStorage.getItem('app_version');
        if (storedVersion !== APP_VERSION) {
            console.log("New version detected. Clearing cache...");
            localStorage.clear(); // Clear old data

            // Unregister Service Workers to force update
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                });
            }

            localStorage.setItem('app_version', APP_VERSION);
            window.location.reload();
        }
    }, []);

    const [currentData, setCurrentData] = useState<Dish[]>(budgetData);
    const [isOptimized, setIsOptimized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showIntro, setShowIntro] = useState(true);

    // Intro Timer
    useEffect(() => {
        const timer = setTimeout(() => setShowIntro(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    // Chef IA State
    const [showChefModal, setShowChefModal] = useState(false);
    const [chefInput, setChefInput] = useState({ budget: '', people: '', preference: '' });
    const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);

    const handleGenerateMenu = async () => {
        if (!chefInput.budget || !chefInput.people || !chefInput.preference) return;

        setIsGeneratingMenu(true);
        try {
            const newMenu = await generateMenuAction(
                parseFloat(chefInput.budget),
                parseInt(chefInput.people),
                chefInput.preference
            );

            if (newMenu && Array.isArray(newMenu)) {
                setCurrentData(newMenu);
                setShowChefModal(false);
                setIsOptimized(false); // Reset optimization state since data changed
                setChefInput({ budget: '', people: '', preference: '' });
            }
        } catch (error) {
            console.error("Error generating menu:", error);
            alert("Hubo un error al generar el menú. Intenta de nuevo.");
        } finally {
            setIsGeneratingMenu(false);
        }
    };

    // Voice Assistant State
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    // Use window.webkitSpeechRecognition if available, or SpeechRecognition
    // Need to handle TS definition for webkitSpeechRecognition or use any or declare it.
    // For simplicity, I'll access it via window as any.

    const handleVoiceSuccess = async (text: string) => {
        setIsProcessingVoice(true);
        setIsRecording(false);
        try {
            const result = await parseVoiceCommand(text);
            if (result && result.items && Array.isArray(result.items)) {
                const newItems: any[] = [];
                for (const item of result.items) {
                    const tempItem = {
                        id: `v-${Date.now()}-${Math.random()}`,
                        name: item.name,
                        quantity: item.quantity,
                        requester: item.requester || 'Voz',
                        price: '',
                        timestamp: new Date().toISOString()
                    };
                    newItems.push(tempItem);

                    // Sync to DB immediately for each item
                    saveFailedItem({
                        name: item.name,
                        quantity: String(item.quantity),
                        requester: item.requester || 'Voz',
                        price: ''
                    }).catch(console.error);
                }

                // Update local state
                const updatedList = [...missingItems, ...newItems];

                // Check for duplicate keys in missingItems (shouldn't happen with random ID but good practice)
                // Actually setMissingItems will replace.
                // But missingItems state inside this closure might be stale if I don't use callback form?
                // Yes, better use callback form or ensure missingItems is fresh.
                // However, parseVoiceCommand is async, so missingItems *could* change.
                setMissingItems(prev => {
                    const combined = [...prev, ...newItems];
                    localStorage.setItem('missingItems', JSON.stringify(combined));
                    return combined;
                });

                // Show success toast? For now just visual cue.
                setAddedSuccess(true);
                setTimeout(() => setAddedSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Error understanding voice:", error);
            alert("No entendí bien el comando. Intenta de nuevo.");
        } finally {
            setIsProcessingVoice(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            // Stop logic handles by the onend event usually, but here we force stop if needed
            // Actually, best way is to let the recognition object stop.
            // But since I don't want to store the "recognition" instance in state (it's non-serializable),
            // I will initiate it on click if not recording.
            // If ALREADY recording, I just want it to stop.
            // Limitation: If I don't have the instance reference, I can't call .stop().
            // So I should keep a ref.

            // To keep simple: Only allow STARTING manually. It stops automatically or on silence.
            // Or I can store it in a Ref.
            setIsRecording(false);
            window.location.reload(); // Hard stop for now as quick fix or use ref properly.
            // Let's implement Ref pattern below.
        } else {
            startListening();
        }
    };

    const recognitionRef = React.useRef<any>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Tu navegador no soporta reconocimiento de voz.");
            return;
        }

        const SpeechData = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechData();

        recognition.lang = 'es-PE';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log("Escuchado:", transcript);
            handleVoiceSuccess(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            // If stopped without result, just reset state
            // But if specific processed, handleVoiceSuccess does the state reset.
            // We can check isProcessingVoice but that state update might be delayed.
            // Safest is to just setRecording false here if not already handled.
            if (!isProcessingVoice) setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // Missing Items State
    const [missingItems, setMissingItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ name: '', quantity: '', price: '', requester: '' });
    const [isSending, setIsSending] = useState(false);
    const [addedSuccess, setAddedSuccess] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Cow Fund State
    const [cowFunds, setCowFunds] = useState<CowFundItem[]>(INITIAL_COW_FUNDS);
    const [newCowFund, setNewCowFund] = useState({ name: '', target: '' });
    const [newContribution, setNewContribution] = useState({ fundId: '', participantId: '', amount: '' });
    const [showCowFundModal, setShowCowFundModal] = useState(false);

    const handleAddCowFund = () => {
        if (!newCowFund.name || !newCowFund.target) return;
        const fund: CowFundItem = {
            id: `cow-${Date.now()}`,
            name: newCowFund.name,
            targetAmount: parseFloat(newCowFund.target),
            currentAmount: 0,
            status: 'active',
            contributors: []
        };
        const updatedFunds = [...cowFunds, fund];
        setCowFunds(updatedFunds);
        saveCowFunds(updatedFunds).catch(console.error); // Persist
        setNewCowFund({ name: '', target: '' });
    };

    const handleContribute = () => {
        if (!newContribution.fundId || !newContribution.participantId || !newContribution.amount) return;

        const participant = participants.find(p => p.id === newContribution.participantId);
        if (!participant) return;

        const amount = parseFloat(newContribution.amount);

        const updatedFunds = cowFunds.map(fund => {
            if (fund.id === newContribution.fundId) {
                const updatedFund = {
                    ...fund,
                    currentAmount: fund.currentAmount + amount,
                    contributors: [...fund.contributors, {
                        id: `c-${Date.now()}`,
                        participantId: participant.id,
                        name: participant.name,
                        amount: amount,
                        timestamp: new Date().toISOString()
                    }]
                };
                if (updatedFund.currentAmount >= updatedFund.targetAmount) {
                    updatedFund.status = 'completed';
                }
                return updatedFund;
            }
            return fund;
        });

        setCowFunds(updatedFunds);
        saveCowFunds(updatedFunds).catch(console.error); // Persist
        setNewContribution({ ...newContribution, amount: '' });
    };

    const handleClearCowFunds = async () => {
        if (!confirm("⚠️ ¿Estás seguro de eliminar TODAS las Vacas y sus registros? Esta acción no se puede deshacer.")) return;

        try {
            await clearCowFundsData();
            setCowFunds([]); // Reset to empty, or INITIAL_COW_FUNDS if preferred, but usually clear means clear all user data
        } catch (error) {
            console.error("Error clearing cow funds:", error);
        }
    };

    // Load initial missing items on mount
    useEffect(() => {
        getCowFunds().then(funds => {
            if (funds && funds.length > 0) {
                setCowFunds(funds);
            }
        });

        const localItems = JSON.parse(localStorage.getItem('missingItems') || '[]');
        setMissingItems(localItems);

        getFailedItems().then(serverItems => {
            // Merge server items with local items, avoiding duplicates by ID
            const combined = [...localItems];
            serverItems.forEach((sItem: any) => {
                if (!combined.find(lItem => lItem.id === sItem.id)) {
                    combined.push(sItem);
                }
            });
            setMissingItems(combined);
        });
    }, []);

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.requester) return;

        setIsSending(true);

        // Optimistic UI Update & Local Storage
        const tempItem = {
            id: Date.now().toString(),
            ...newItem,
            timestamp: new Date().toISOString()
        };

        const updatedItems = [...missingItems, tempItem];
        setMissingItems(updatedItems);
        localStorage.setItem('missingItems', JSON.stringify(updatedItems));

        setNewItem({ name: '', quantity: '', price: '', requester: '' });
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 3000);

        try {
            await saveFailedItem(newItem);
        } catch (error) {
            console.error("Error syncing to server:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleClearList = async () => {
        if (!confirm("¿Estás seguro de querer limpiar toda la lista de faltantes?")) return;

        setIsClearing(true);
        try {
            // Clear Local Storage
            localStorage.removeItem('missingItems');
            setMissingItems([]);

            // Clear Server DB
            await clearFailedItems();
        } catch (error) {
            console.error("Error clearing list:", error);
        } finally {
            setIsClearing(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (missingItems.length === 0) return;

        const date = new Date().toLocaleDateString('es-PE');
        let message = `*FALTANTES COMANDA - ${date}* 🚨\n\n`;

        missingItems.forEach((item, index) => {
            message += `${index + 1}. *${item.name}* (${item.quantity})\n`;
            message += `   Solicitado por: ${item.requester}\n`;
            if (item.price) message += `   Ref: S/ ${item.price}\n`;
            message += `\n`;
        });

        message += `_Enviado desde Presupuesto Mix_`;

        const encodedMessage = encodeURIComponent(message);
        // Using api.whatsapp.com for better compatibility across devices
        const url = `https://api.whatsapp.com/send?phone=51988945307&text=${encodedMessage}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    const [expandedDish, setExpandedDish] = useState<string | null>("dish-1");
    const [hasFetchedAI, setHasFetchedAI] = useState(false);

    // Editable State
    // const [peopleCount, setPeopleCount] = useState(INITIAL_PEOPLE_COUNT); // Deprecated
    const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);

    const activePayingCount = useMemo(() => {
        return participants.filter(p => p.isActive && p.type === 'Adulto').length;
    }, [participants]);

    const activeTotalCount = useMemo(() => {
        return participants.filter(p => p.isActive).length;
    }, [participants]);

    const handleToggleParticipant = (id: string) => {
        setParticipants(prev => prev.map(p => {
            if (p.id === id) return { ...p, isActive: !p.isActive };
            return p;
        }));
    };

    const handleTogglePaid = (id: string) => {
        setParticipants(prev => prev.map(p => {
            if (p.id === id) return { ...p, hasPaid: !p.hasPaid };
            return p;
        }));
    };

    // Handlers for editing
    const handleUpdateIngredient = (dishId: string, ingredientId: string, field: keyof Ingredient | 'discount', value: number) => {
        setCurrentData(prev => prev.map(dish => {
            if (dish.id !== dishId) return dish;
            return {
                ...dish,
                ingredients: dish.ingredients.map(ing => {
                    if (ing.id !== ingredientId) return ing;

                    const updates: any = {}; // Use any to bypass strict Partial<Ingredient> issues with dynamic keys for this logic block

                    if (field === 'discount') {
                        updates.discount = value;
                        // Recalculate total with new discount
                        updates.priceTotal = (ing.priceUnit * ing.quantity) * (1 - value / 100);
                    } else if (field === 'priceUnit') {
                        updates.priceUnit = value;
                        // Recalculate total considering existing discount
                        const discountFactor = 1 - (ing.discount || 0) / 100;
                        updates.priceTotal = (value * ing.quantity) * discountFactor;
                    } else if (field === 'priceTotal') {
                        updates.priceTotal = value;
                        // If setting total directly, we assume it INCLUDES the discount.
                        // So Unit Price = (Total / DiscountFactor) / Quantity
                        // Prevent division by zero
                        if (ing.quantity > 0) {
                            const discountFactor = 1 - (ing.discount || 0) / 100;
                            if (discountFactor > 0) {
                                updates.priceUnit = (value / discountFactor) / ing.quantity;
                            } else {
                                updates.priceUnit = 0; // Edge case 100% discount
                            }
                        }
                    } else if (field === 'quantity') {
                        updates.quantity = value;
                        // Recalculate total considering existing discount
                        const discountFactor = 1 - (ing.discount || 0) / 100;
                        updates.priceTotal = (ing.priceUnit * value) * discountFactor;
                    }

                    return { ...ing, ...updates };
                })
            };
        }));
    };

    // Calculate totals based on current mode
    const { totalCost, originalCost, savings, marketBreakdown } = useMemo(() => {
        let original = 0;
        let optimized = 0;
        const marketCounts: Record<string, number> = {};

        currentData.forEach(dish => {
            dish.ingredients.forEach(item => {
                // Original cost is just sum of current prices (user edited or base)
                original += item.priceTotal;

                // Optimized calculation
                let usedPrice = item.priceTotal;

                if (isOptimized && item.marketPrices && item.marketPrices.length > 0) {
                    const bestPrice = Math.min(...item.marketPrices.map(m => m.price));
                    const bestMarket = item.marketPrices.find(m => m.price === bestPrice);

                    if (item.priceTotal > 0) {
                        // Recalculate optimization based on current quantity
                        const optimizedVal = (item.quantity * bestPrice);
                        usedPrice = optimizedVal;
                        if (bestMarket) {
                            marketCounts[bestMarket.marketName] = (marketCounts[bestMarket.marketName] || 0) + optimizedVal;
                        }
                    }
                }

                if (isOptimized) {
                    optimized += usedPrice;
                }
            });
        });

        // We compare against the CURRENT edited "original" total, not static base data, 
        // because if user changes price, that IS the new original.

        return {
            totalCost: isOptimized ? optimized : original,
            originalCost: original,
            savings: original - optimized,
            marketBreakdown: Object.entries(marketCounts).map(([name, value]) => ({ name, value }))
        };
    }, [currentData, isOptimized]);

    const toggleOptimization = async () => {
        if (isOptimized) {
            setIsOptimized(false);
            return;
        }

        if (!hasFetchedAI) {
            setIsLoading(true);
            try {
                const optimizedDishes = await optimizeBudgetWithAI(currentData); // Send current data
                setCurrentData(optimizedDishes);
                setHasFetchedAI(true);
                setIsOptimized(true);
            } catch (error) {
                console.error("Failed to fetch AI data", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsOptimized(true);
        }
    };

    const chartData = [
        { name: 'Estándar', amount: originalCost },
        { name: 'Optimizado IA', amount: isOptimized ? totalCost : (originalCost - savings) },
    ];

    return (
        <>
            <AnimatePresence mode="wait">
                {showIntro ? (
                    <IntroScreen key="intro" />
                ) : (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30"
                    >
                        <BudgetTicker data={currentData} />

                        <div className="max-w-7xl mx-auto px-4 py-8">

                            {/* Header */}
                            {/* Header */}
                            <header className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-10 gap-6 md:gap-4">
                                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
                                    <div className="relative w-28 h-20 md:w-32 md:h-24 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-500/20 group shrink-0">
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10"></div>
                                        <img
                                            src="/Ajo Professional_food_photography_2k_20260218142.jpeg"
                                            alt="Ajo Professional"
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                        />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent flex flex-col md:flex-row items-center gap-2 md:gap-3">
                                            <Calculator className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
                                            <span>Presupuesto Mix Editable</span>
                                        </h1>
                                        <p className="text-slate-400 mt-1 md:mt-2 text-sm md:text-lg">Dashboard Dinámico & Comparativa IA</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-center items-center gap-4 w-full md:w-auto">
                                    {/* People Count Edit */}
                                    <button
                                        onClick={() => setShowParticipantsModal(true)}
                                        className="bg-slate-900 border border-slate-700 hover:border-amber-500 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg transition-colors group"
                                    >
                                        <Users className="w-5 h-5 text-purple-400 group-hover:text-amber-400 transition-colors" />
                                        <div className="flex flex-col items-start leading-none text-left">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Comensales</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-bold text-slate-200">{activeTotalCount} Total</span>
                                                <span className="text-xs text-slate-500">/</span>
                                                <span className="text-sm font-bold text-emerald-400">{activePayingCount} Pagan</span>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-slate-600" />
                                    </button>


                                    <button
                                        onClick={toggleOptimization}
                                        disabled={isLoading}
                                        className={`
                                relative overflow-hidden px-6 py-2 md:px-8 md:py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl text-sm md:text-base
                                ${isOptimized
                                                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-900 hover:shadow-orange-500/25'
                                            }
                            `}
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                                                    <span>Analizando...</span>
                                                </>
                                            ) : isOptimized ? (
                                                <>
                                                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                                                    <span>Volver a Estándar</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                                                    <span>Optimizar con IA</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </header>

                            <SeasonalityAlerts />

                            {/* KPIs Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <KpiCard
                                    title="Costo Total"
                                    value={`S/ ${totalCost.toFixed(2)}`}
                                    icon={<ShoppingCart className="w-6 h-6 text-blue-400" />}
                                    trend={isOptimized ? `Ahorro: S/ ${savings.toFixed(2)}` : null}
                                    isPositive={true}
                                />
                                <KpiCard
                                    title="Costo por Adulto"
                                    value={activePayingCount > 0 ? `S/ ${(totalCost / activePayingCount).toFixed(2)}` : "N/A"}
                                    subtitle={`${activePayingCount} Pagantes (${activeTotalCount} Total)`}
                                    icon={<Users className="w-6 h-6 text-purple-400" />}
                                />
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden">
                                    <h3 className="text-slate-400 text-sm font-medium mb-4 z-10">Proyección de Ahorro</h3>
                                    <div className="h-24 w-full z-10">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} layout="vertical">
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                                    cursor={{ fill: 'transparent' }}
                                                />
                                                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#64748b' : '#10b981'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Abstract BG decoration */}
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                                </div>
                            </div>

                            {/* Main Content Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* Left Column: Dish List */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                                            <Store className="w-6 h-6 text-amber-500" />
                                            Detalle de Comanda
                                        </h2>
                                        <div className="text-xs text-slate-500 italic">
                                            * Puedes editar cantidades y precios directamente
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {currentData.map((dish) => (
                                            <DishRow
                                                key={dish.id}
                                                dish={dish}
                                                isExpanded={expandedDish === dish.id}
                                                onToggle={() => setExpandedDish(expandedDish === dish.id ? null : dish.id)}
                                                isOptimized={isOptimized}
                                                onUpdate={handleUpdateIngredient}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Right Column: Market Analysis (Visible only when optimized) */}
                                <div className="lg:col-span-1 space-y-8">
                                    <AnimatePresence>
                                        {isOptimized && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-8"
                                            >
                                                <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                                                    <TrendingDown className="w-6 h-6" />
                                                    Mejores Opciones
                                                </h3>

                                                <div className="space-y-6">
                                                    <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                                                        <p className="text-emerald-300 text-sm mb-1">Ahorro Total Estimado</p>
                                                        <p className="text-3xl font-bold text-emerald-400">S/ {savings.toFixed(2)}</p>
                                                        <p className="text-xs text-emerald-500/80 mt-2">Reducción del {originalCost > 0 ? ((savings / originalCost) * 100).toFixed(1) : 0}%</p>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-slate-400 text-sm font-semibold mb-3 uppercase tracking-wider">Dónde comprar</h4>
                                                        <div className="space-y-3">
                                                            {marketBreakdown.sort((a, b) => b.value - a.value).map((market) => (
                                                                <div key={market.name} className="flex justify-between items-center group">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-2 h-2 rounded-full bg-slate-600 group-hover:bg-amber-500 transition-colors"></div>
                                                                        <span className="text-slate-300">{market.name}</span>
                                                                    </div>
                                                                    <span className="font-mono text-slate-400">S/ {market.value.toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="pt-6 border-t border-slate-800">
                                                        <p className="text-xs text-slate-500 italic">
                                                            * Precios referenciales comparados con base de datos histórica de mercados locales.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        {!isOptimized && (
                                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-64 border-dashed">
                                                <Sparkles className="w-12 h-12 text-slate-700 mb-4" />
                                                <p className="text-slate-500">Activa la IA para ver el análisis de mercado</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>

                            {isOptimized && (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-12"
                                >
                                    <ComparativeMarketAnalysis data={currentData} />
                                </motion.div>
                            )}

                            {/* Cow Fund Section */}
                            <div className="mt-16 mb-16 relative">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                            <span className="bg-amber-500/20 text-amber-400 p-2 rounded-lg">
                                                <Gift className="w-6 h-6" />
                                            </span>
                                            La Vaca del Cariño
                                            <span className="text-xs bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Beta</span>
                                        </h2>
                                        <p className="text-slate-400 mt-2 max-w-2xl">
                                            Para esos caprichos extra que no todos pagan. Crea una bolsa y suma voluntarios.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleClearCowFunds}
                                            className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-full px-4 py-2 flex items-center gap-2 transition-all text-xs font-bold"
                                            title="Borrar todas las vacas y aportes"
                                        >
                                            <AlertTriangle className="w-3 h-3" />
                                            Limpiar (Beta)
                                        </button>
                                        <button
                                            onClick={() => setShowCowFundModal(true)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 rounded-full px-6 py-2 flex items-center gap-2 transition-all shadow-lg"
                                        >
                                            <Plus className="w-4 h-4 text-amber-500" />
                                            <span>Crear Nueva Vaca</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cowFunds.map(fund => {
                                        const progress = Math.min((fund.currentAmount / fund.targetAmount) * 100, 100);
                                        const isCompleted = progress >= 100;

                                        return (
                                            <div key={fund.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                                                {isCompleted && (
                                                    <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-lg z-10">
                                                        ¡Completado!
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-slate-100 text-lg">{fund.name}</h3>
                                                        <p className="text-sm text-slate-400">Meta: <span className="text-emerald-400 font-mono font-bold">S/ {fund.targetAmount.toFixed(2)}</span></p>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-full border border-slate-800">
                                                        <PiggyBank className={`w-6 h-6 ${isCompleted ? 'text-emerald-400' : 'text-amber-500'}`} />
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="text-slate-500 font-medium">{fund.contributors.length} aportantes</span>
                                                        <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {progress.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                                                        />
                                                    </div>
                                                    <div className="mt-1 text-right text-xs text-slate-500 font-mono">
                                                        Faltan: S/ {Math.max(fund.targetAmount - fund.currentAmount, 0).toFixed(2)}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {/* Quick Contribute Form */}
                                                    {!isCompleted && (
                                                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 text-center">Sumar Aporte</p>
                                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                                <select
                                                                    className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500"
                                                                    value={newContribution.participantId}
                                                                    onChange={(e) => setNewContribution({ ...newContribution, participantId: e.target.value, fundId: fund.id })}
                                                                >
                                                                    <option value="">¿Quién?</option>
                                                                    {participants.filter(p => p.isActive && p.type === 'Adulto').map(p => (
                                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Monto"
                                                                    className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-amber-500"
                                                                    value={newContribution.fundId === fund.id ? newContribution.amount : ''}
                                                                    onChange={(e) => setNewContribution({ ...newContribution, amount: e.target.value, fundId: fund.id })}
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleContribute}
                                                                disabled={!newContribution.participantId || !newContribution.amount || newContribution.fundId !== fund.id}
                                                                className="w-full bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-400 text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Coins className="w-3 h-3" />
                                                                Aportar
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Contributors List */}
                                                    {fund.contributors.length > 0 && (
                                                        <div className="max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                                            {fund.contributors.slice().reverse().map(c => (
                                                                <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/50 last:border-0">
                                                                    <span className="text-slate-400">{c.name}</span>
                                                                    <span className="text-emerald-500/80 font-mono">+ S/ {c.amount.toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                            <span className="bg-red-500/20 text-red-400 p-2 rounded-lg">
                                                <MessageSquare className="w-6 h-6" />
                                            </span>
                                            ¿Faltó Algo?
                                        </h2>
                                        <p className="text-slate-400 mt-2">Agrega ítems adicionales a la lista y notifica al grupo Kamado Clandestina.</p>
                                    </div>
                                    {missingItems.length === 0 ? (
                                        <button
                                            disabled
                                            className="bg-slate-700 text-slate-400 font-bold py-2 px-6 rounded-full flex items-center gap-2 cursor-not-allowed opacity-50"
                                        >
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <span>Enviar Pedido (0)</span>
                                        </button>
                                    ) : (
                                        <a
                                            href={`https://api.whatsapp.com/send?phone=51988945307&text=${encodeURIComponent(
                                                `*FALTANTES COMANDA - ${new Date().toLocaleDateString('es-PE')}* 🚨\n\n` +
                                                missingItems.map((item, index) =>
                                                    `${index + 1}. *${item.name}* (${item.quantity})\n   Solicitado por: ${item.requester}${item.price ? `\n   Ref: S/ ${item.price}` : ''}\n`
                                                ).join('\n') +
                                                `\n_Enviado desde Presupuesto Mix_`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-full flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20"
                                        >
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                            </div>
                                            <span>Enviar Pedido ({missingItems.length})</span>
                                        </a>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Form */}
                                    <div className="lg:col-span-1 bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quién solicita</label>
                                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus-within:border-amber-500 transition-colors">
                                                    <User className="w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Tu nombre (ej. Chef Pepo)"
                                                        className="bg-transparent w-full outline-none placeholder:text-slate-600"
                                                        value={newItem.requester}
                                                        onChange={(e) => setNewItem({ ...newItem, requester: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Producto Faltante</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej. Carbón Extra"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-500 outline-none transition-colors"
                                                    value={newItem.name}
                                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cantidad</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej. 2 bolsas"
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-500 outline-none transition-colors"
                                                        value={newItem.quantity}
                                                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Precio Ref. (S/)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-500 outline-none transition-colors"
                                                        value={newItem.price}
                                                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleAddItem}
                                                disabled={!newItem.name || !newItem.requester || isSending}
                                                className="w-full bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 mt-2"
                                            >
                                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                Agregar a la Lista
                                            </button>

                                            <AnimatePresence>
                                                {addedSuccess && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="bg-emerald-500/20 text-emerald-400 text-center text-sm font-bold py-2 rounded-lg border border-emerald-500/30"
                                                    >
                                                        ¡Item agregado correctamente!
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="lg:col-span-2 space-y-3">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Items Pendientes</h3>
                                            {missingItems.length > 0 && (
                                                <button
                                                    onClick={handleClearList}
                                                    disabled={isClearing}
                                                    className="text-xs text-red-500 hover:text-red-400 font-bold underline transition-colors disabled:opacity-50"
                                                >
                                                    {isClearing ? "Limpiando..." : "Limpiar Todo"}
                                                </button>
                                            )}
                                        </div>

                                        {missingItems.length === 0 ? (
                                            <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
                                                <p className="text-slate-600">No hay items faltantes reportados aún.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {missingItems.slice().reverse().map((item: any) => (
                                                    <div key={item.id} className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/50 flex flex-col justify-between group hover:border-amber-500/30 transition-colors">
                                                        <div>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-bold text-slate-200 text-lg">{item.name}</span>
                                                                {item.price && <span className="bg-slate-900 text-xs font-mono px-2 py-1 rounded text-slate-400">S/ {item.price}</span>}
                                                            </div>
                                                            <p className="text-sm text-slate-400 mb-1">Cantidad: <span className="text-slate-300 ml-1">{item.quantity}</span></p>
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs">
                                                            <span className="text-slate-500 flex items-center gap-1">
                                                                <User className="w-3 h-3 text-amber-500" />
                                                                <span className="text-amber-500 font-bold">{item.requester}</span>
                                                            </span>
                                                            <span className="text-slate-600">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ParticipantsModal
                            isOpen={showParticipantsModal}
                            onClose={() => setShowParticipantsModal(false)}
                            participants={participants}
                            onToggle={handleToggleParticipant}
                            onTogglePaid={handleTogglePaid}
                            totalCost={totalCost}
                            activePayingCount={activePayingCount}
                        />

                        <CowFundModal
                            isOpen={showCowFundModal}
                            onClose={() => setShowCowFundModal(false)}
                            onAdd={handleAddCowFund}
                            newFund={newCowFund}
                            setNewFund={setNewCowFund}
                        />

                        {/* Chef IA Modal */}
                        <AnimatePresence>
                            {showChefModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
                                    >
                                        <button
                                            onClick={() => setShowChefModal(false)}
                                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>

                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="bg-indigo-500/20 p-3 rounded-xl">
                                                <ChefHat className="w-8 h-8 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-100">Chef IA</h3>
                                                <p className="text-sm text-slate-400">Arma tu menú ideal</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Presupuesto (S/)</label>
                                                <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-2 focus-within:border-indigo-500 transition-colors">
                                                    <span className="text-slate-500 font-bold">S/</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Ej. 400"
                                                        className="bg-transparent border-none outline-none text-slate-200 w-full font-mono text-lg"
                                                        value={chefInput.budget}
                                                        onChange={(e) => setChefInput({ ...chefInput, budget: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Personas</label>
                                                <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-2 focus-within:border-indigo-500 transition-colors">
                                                    <Users className="w-5 h-5 text-slate-500" />
                                                    <input
                                                        type="number"
                                                        placeholder="Ej. 15"
                                                        className="bg-transparent border-none outline-none text-slate-200 w-full"
                                                        value={chefInput.people}
                                                        onChange={(e) => setChefInput({ ...chefInput, people: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estilo / Preferencia</label>
                                                <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-2 focus-within:border-indigo-500 transition-colors">
                                                    <Sparkles className="w-5 h-5 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Ej. Parrilla, Marina, Económico..."
                                                        className="bg-transparent border-none outline-none text-slate-200 w-full"
                                                        value={chefInput.preference}
                                                        onChange={(e) => setChefInput({ ...chefInput, preference: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleGenerateMenu}
                                                disabled={isGeneratingMenu || !chefInput.budget || !chefInput.people || !chefInput.preference}
                                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-lg flex items-center justify-center gap-2 mt-4"
                                            >
                                                {isGeneratingMenu ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Diseñando Menú...
                                                    </>
                                                ) : (
                                                    <>
                                                        Generar Menú
                                                        <ArrowRight className="w-5 h-5" />
                                                    </>
                                                )}
                                            </button>

                                            <p className="text-xs text-center text-slate-500 mt-2">
                                                La IA reemplazará la lista actual con una propuesta nueva.
                                            </p>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Voice Assistant FAB */}
                        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
                            <AnimatePresence>
                                {isProcessingVoice && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 mb-2"
                                    >
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                        <span className="text-sm font-medium">Procesando...</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={toggleRecording}
                                className={`
                        w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-90
                        ${isRecording
                                        ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30'
                                        : 'bg-indigo-600 hover:bg-indigo-500 ring-2 ring-indigo-400/50'
                                    }
                    `}
                            >
                                {isRecording ? (
                                    <MicOff className="w-8 h-8 text-white" />
                                ) : (
                                    <Mic className="w-8 h-8 text-white" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}


function ComparativeMarketAnalysis({ data }: { data: Dish[] }) {
    // Generate data for graph
    const topIngredients = data.flatMap(d => d.ingredients)
        .filter(i => i.marketPrices && i.marketPrices.length > 0)
        .map(i => {
            const best = Math.min(...i.marketPrices.map(m => m.price));
            const bestMarket = i.marketPrices.find(m => m.price === best)?.marketName || 'Mercado';

            return {
                name: i.name.substring(0, 10), // Short name for axis
                full_name: i.name,
                "Tu Precio": i.priceTotal, // Using total for impact
                "Mercado Local": (best * i.quantity),
                best_market: bestMarket,
                savings: i.priceTotal - (best * i.quantity)
            };
        })
        .sort((a, b) => b.savings - a.savings) // Show biggest savings first
        .slice(0, 10); // Top 10 opportunities

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 mb-8">
                <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                    Análisis de Mercado
                </h3>
                <p className="text-slate-400">Comparativa de tus costos vs. precios óptimos locales</p>
            </div>

            <div className="h-[400px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={topIngredients} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorYour" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ color: '#cbd5e1' }}
                            formatter={(value: number | undefined) => [value ? `S/ ${value ? value.toFixed(2) : '0.00'}` : 'N/A', '']}
                            labelStyle={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.5rem' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        <Area
                            type="monotone"
                            dataKey="Tu Precio"
                            stroke="#f59e0b"
                            fillOpacity={1}
                            fill="url(#colorYour)"
                            strokeWidth={3}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="Mercado Local"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorMarket)"
                            strokeWidth={3}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {topIngredients.slice(0, 4).map((item, i) => (
                    <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1 truncate" title={item.full_name}>{item.full_name}</div>
                        <div className="flex justify-between items-end">
                            <div className="text-emerald-400 font-bold font-mono">S/ {item["Mercado Local"].toFixed(2)}</div>
                            <div className="text-xs text-slate-600">en {item.best_market}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


function KpiCard({ title, value, subtitle, icon, trend, isPositive }: any) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
                    <div className="text-3xl font-bold text-slate-100 mt-1 group-hover:text-amber-400 transition-colors">{value}</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl group-hover:bg-slate-700 transition-colors">
                    {icon}
                </div>
            </div>
            {(subtitle || trend) && (
                <div className="flex items-center justify-between mt-2">
                    {subtitle && <span className="text-sm text-slate-500">{subtitle}</span>}
                    {trend && (
                        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {trend}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

function DishRow({
    dish,
    isExpanded,
    onToggle,
    isOptimized,
    onUpdate
}: {
    dish: Dish,
    isExpanded: boolean,
    onToggle: () => void,
    isOptimized: boolean,
    onUpdate: (d: string, i: string, f: keyof Ingredient, v: number) => void
}) {
    const total = dish.ingredients.reduce((acc, item) => acc + item.priceTotal, 0);

    // Calculate optimized total only
    const optimizedTotal = dish.ingredients.reduce((acc, item) => {
        if (item.marketPrices.length > 0) {
            const best = Math.min(...item.marketPrices.map(m => m.price));
            return acc + (best * item.quantity);
        }
        return acc + item.priceTotal;
    }, 0);

    const displayTotal = isOptimized ? optimizedTotal : total;
    const hasSavings = total - optimizedTotal > 0.01; // Logic tolerance

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300">
            <div
                onClick={onToggle}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isExpanded ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-200">{dish.name}</h3>
                        <p className="text-sm text-slate-500">{dish.ingredients.length} insumos</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-xl font-bold ${isOptimized && hasSavings ? 'text-emerald-400' : 'text-slate-200'}`}>
                        S/ {displayTotal.toFixed(2)}
                    </p>
                    {isOptimized && hasSavings && (
                        <p className="text-xs text-emerald-500 line-through">S/ {total.toFixed(2)}</p>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-slate-950/30 border-t border-slate-800"
                    >
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-12 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 gap-2">
                                <div className="col-span-4">Insumo</div>
                                <div className="col-span-3 text-center">Cant. / Desc.</div>
                                <div className="col-span-2 text-right">Precio U.</div>
                                <div className="col-span-3 text-right">Total</div>
                            </div>
                            {dish.ingredients.map((ing) => (
                                <IngredientRow
                                    key={ing.id}
                                    ingredient={ing}
                                    isOptimized={isOptimized}
                                    onUpdate={(f, v) => onUpdate(dish.id, ing.id, f, v)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function IngredientRow({
    ingredient,
    isOptimized,
    onUpdate
}: {
    ingredient: Ingredient,
    isOptimized: boolean,
    onUpdate: (field: keyof Ingredient | 'discount', value: number) => void
}) {
    // Find best price
    let bestPrice = ingredient.priceUnit;
    let bestMarket = "Original";
    let isCheaper = false;

    if (isOptimized && ingredient.marketPrices.length > 0) {
        const min = Math.min(...ingredient.marketPrices.map(m => m.price));
        if (min < ingredient.priceUnit) { // Compare against current unit price
            bestPrice = min;
            const marketObj = ingredient.marketPrices.find(m => m.price === min);
            bestMarket = marketObj ? marketObj.marketName : "Oferta";
            isCheaper = true;
        }
    }

    const displayTotal = isCheaper ? (bestPrice * ingredient.quantity) : ingredient.priceTotal;

    const canHaveDiscount = ingredient.name.toLowerCase().includes("panceta de cerdo");
    const hasDiscount = (ingredient.discount || 0) > 0;
    const finalTotal = displayTotal * (hasDiscount ? (1 - (ingredient.discount || 0) / 100) : 1);

    const [isFocused, setIsFocused] = useState(false);

    // Historic Data Check
    const historicData = HISTORIC_DATA[ingredient.name];
    const inflationRate = historicData ? ((ingredient.priceUnit - historicData.lastPrice) / historicData.lastPrice) : 0;
    const isPriceHigher = inflationRate > 0.05; // 5% threshold

    return (
        <div className={`grid grid-cols-12 items-center p-3 rounded-lg text-sm gap-2 transition-colors duration-300 ${historicData?.seasonality === 'banned' ? 'bg-red-950/30 border border-red-500/50' : isCheaper ? 'bg-emerald-900/10 border border-emerald-500/20' : hasDiscount ? 'bg-red-900/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'hover:bg-slate-800/30 group'}`}>
            <div className="col-span-5 pr-2">
                <div className="flex items-center flex-wrap gap-2">
                    <p className={`font-medium break-words ${hasDiscount ? 'text-red-400' : 'text-slate-300'}`}>{ingredient.name}</p>

                    {/* Seasonality Badges */}
                    {historicData && (
                        <>
                            {historicData.seasonality === 'best_time' && (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30" title={historicData.seasonalityMsg}>
                                    <Leaf className="w-3 h-3" /> Temporada
                                </span>
                            )}
                            {historicData.seasonality === 'banned' && (
                                <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-red-500/30 font-bold uppercase animate-pulse" title={historicData.seasonalityMsg}>
                                    <AlertTriangle className="w-3 h-3" /> VEDA
                                </span>
                            )}
                            {historicData.seasonality === 'expensive' && (
                                <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30" title={historicData.seasonalityMsg}>
                                    <TrendingUp className="w-3 h-3" /> Sube
                                </span>
                            )}
                        </>
                    )}
                </div>

                {/* Inflation Warning */}
                {isPriceHigher && (
                    <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1 font-mono">
                        <TrendingUp className="w-3 h-3" />
                        Subió {(inflationRate * 100).toFixed(0)}% vs. mes anterior
                    </div>
                )}

                {isCheaper && !hasDiscount && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
                        <ArrowRight className="w-3 h-3" />
                        <span>Mejor en {bestMarket}</span>
                    </div>
                )}
                {canHaveDiscount && (
                    <div className="mt-2">
                        <label className="text-[10px] uppercase font-bold text-red-500 flex items-center justify-between mb-1">
                            <span>Descuento Especial: {ingredient.discount || 0}%</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="25"
                            step="5"
                            value={ingredient.discount || 0}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all"
                            onChange={(e) => onUpdate('discount', parseInt(e.target.value))}
                        />
                        <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
                            <span>0%</span>
                            <span>25%</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Editable Quantity */}
            <div className="col-span-2 flex justify-center">
                <div className="flex items-center gap-1 bg-slate-950/50 rounded-md px-1 py-1 border border-slate-800 focus-within:border-amber-500 transition-colors w-full">
                    <input
                        type="number"
                        className="w-full bg-transparent text-center outline-none text-slate-300 min-w-0 text-xs md:text-sm"
                        value={ingredient.quantity}
                        onChange={(e) => onUpdate('quantity', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-[10px] md:text-xs text-slate-500 truncate shrink-0">{ingredient.unit}</span>
                </div>
            </div>

            {/* Editable Unit Price */}
            <div className="col-span-2 text-right flex justify-end flex-col items-end">
                <div className="flex items-center gap-1 bg-slate-950/50 rounded-md px-1 py-1 border border-slate-800 focus-within:border-amber-500 transition-colors w-full">
                    <span className="text-slate-500 text-[10px]">S/</span>
                    <input
                        type="number"
                        step="0.01"
                        className={`w-full bg-transparent text-right outline-none font-mono text-xs md:text-sm ${isCheaper ? 'text-slate-400 line-through' : 'text-slate-300'}`}
                        value={isFocused ? ingredient.priceUnit : Number(ingredient.priceUnit).toFixed(2)}
                        onChange={(e) => onUpdate('priceUnit', parseFloat(e.target.value) || 0)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />
                </div>
                {isCheaper && <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{bestPrice.toFixed(2)}</div>}
            </div>

            {/* Editable Total Price */}
            <div className="col-span-3 text-right flex flex-col items-end justify-center">
                <div className={`flex items-center gap-1 rounded-md px-1 py-1 border transition-colors w-full ${hasDiscount ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-slate-950/50 border-slate-800 focus-within:border-amber-500'}`}>
                    <span className={`text-[10px] ${hasDiscount ? 'text-red-500/70' : 'text-slate-500'}`}>S/</span>
                    <input
                        type="number"
                        className={`w-full bg-transparent text-right outline-none font-mono font-bold text-xs md:text-sm ${hasDiscount ? 'text-red-400' : isCheaper ? 'text-emerald-400' : 'text-slate-200'}`}
                        value={finalTotal.toFixed(2)}
                        onChange={(e) => onUpdate('priceTotal', parseFloat(e.target.value) || 0)}
                    />
                </div>
                {hasDiscount && (
                    <div className="text-[9px] text-red-400 mt-0.5 font-bold animate-pulse">
                        - S/ {(displayTotal - finalTotal).toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    );
}




function ParticipantsModal({
    isOpen,
    onClose,
    participants,
    onToggle,
    onTogglePaid,
    totalCost,
    activePayingCount
}: {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    onToggle: (id: string) => void;
    onTogglePaid: (id: string) => void;
    totalCost: number;
    activePayingCount: number;
}) {
    const [mode, setMode] = useState<'manage' | 'collect'>('manage');
    const [showQr, setShowQr] = useState(false);

    const costPerPerson = activePayingCount > 0 ? (totalCost / activePayingCount) : 0;

    const generatePaymentLink = (name: string, amount: number) => {
        const message = `Hola ${name}, tu cuota para la comanda es de S/ ${amount.toFixed(2)}. Puedes yapear aquí.`;
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col z-10"
                    >
                        <div className="p-4 border-b border-slate-800 bg-slate-900 z-10 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-amber-500" />
                                    Gestionar Invitados
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mode Toggle */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl">
                                <button
                                    onClick={() => setMode('manage')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'manage' ? 'bg-slate-800 text-slate-100 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Asistencia
                                </button>
                                <button
                                    onClick={() => setMode('collect')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'collect' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Cobranza ($)
                                </button>
                            </div>
                        </div>

                        {mode === 'manage' ? (
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                <div className="space-y-2">
                                    {participants.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => onToggle(p.id)}
                                            className={`
                                            flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border group select-none
                                            ${p.isActive
                                                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
                                                    : 'bg-slate-950/50 border-transparent opacity-60 hover:opacity-100'
                                                }
                                        `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                                                    ${p.isActive ? 'bg-amber-500 border-amber-500' : 'border-slate-600 group-hover:border-slate-500'}
                                                `}>{p.isActive && <Check className="w-4 h-4 text-slate-900 stroke-[3]" />}</div>

                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center border
                                                        ${p.isActive
                                                            ? (p.type === 'Adulto' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400')
                                                            : 'bg-slate-800 border-slate-700 text-slate-600'}
                                                    `}>{p.type === 'Niño' ? <Baby className="w-5 h-5" /> : <User className="w-5 h-5" />}</div>
                                                    <div>
                                                        <p className={`font-bold text-base ${p.isActive ? 'text-slate-100' : 'text-slate-500'}`}>{p.name}</p>
                                                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                                                            {p.type}
                                                            {p.isActive && (
                                                                <span className={p.type === 'Adulto' ? 'text-emerald-500' : 'text-blue-500'} >
                                                                    • {p.type === 'Adulto' ? 'Participa y Paga' : 'Participa Gratis'}
                                                                </span>
                                                            )}
                                                            {!p.isActive && <span className="text-slate-600">• No Participa</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {p.isActive ? (
                                                    p.type === 'Adulto' ? (
                                                        <div className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                                            S/ {costPerPerson.toFixed(2)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-blue-400 font-bold text-xs bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                                            S/ 0.00
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="text-slate-600 font-bold text-xs px-2 py-1">
                                                        --
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                                {/* Dashboard Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl text-center">
                                        <p className="text-xs text-emerald-400 uppercase font-bold mb-1">Pagados</p>
                                        <p className="text-2xl font-bold text-emerald-300">
                                            {participants.filter(p => p.isActive && p.type === 'Adulto' && p.hasPaid).length}
                                            <span className="text-sm text-emerald-500/70 ml-1">/ {activePayingCount}</span>
                                        </p>
                                    </div>
                                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center">
                                        <p className="text-xs text-red-400 uppercase font-bold mb-1">Por Cobrar</p>
                                        <p className="text-2xl font-bold text-red-300">
                                            S/ {(participants.filter(p => p.isActive && p.type === 'Adulto' && !p.hasPaid).length * costPerPerson).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* QR Code Toggle */}
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                                    <button
                                        onClick={() => setShowQr(!showQr)}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mb-2"
                                    >
                                        <div className="w-5 h-5 bg-white rounded-sm p-0.5">
                                            <div className="w-full h-full bg-black"></div>
                                        </div>
                                        {showQr ? 'Ocultar QR Yape/Plin' : 'Mostrar QR Yape/Plin'}
                                    </button>

                                    <AnimatePresence>
                                        {showQr && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 p-2 bg-white rounded-xl inline-block">
                                                    <img src="/WhatsApp Image 2026-02-18 at 11.26.49 PM.jpeg" alt="QR Yape Plin" className="w-48 h-auto rounded-lg" />
                                                </div>
                                                <p className="text-slate-500 text-xs mt-2">Escanea para pagar S/ {costPerPerson.toFixed(2)}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Collection List */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Lista de Pagos</h4>
                                    {participants.filter(p => p.isActive && p.type === 'Adulto').map(p => (
                                        <div key={p.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    onClick={() => onTogglePaid(p.id)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors border-2 ${p.hasPaid ? 'bg-emerald-500 border-emerald-500 text-slate-900' : 'bg-slate-900 border-red-500/50 text-red-500 hover:border-red-500'}`}
                                                >
                                                    {p.hasPaid ? <Check className="w-6 h-6 stroke-[3]" /> : <span className="font-bold text-xs">NO</span>}
                                                </div>
                                                <div>
                                                    <p className={`font-bold ${p.hasPaid ? 'text-slate-300' : 'text-slate-100'}`}>{p.name}</p>
                                                    <p className={`text-xs ${p.hasPaid ? 'text-emerald-500' : 'text-red-400 font-bold'}`}>
                                                        {p.hasPaid ? 'Pagado' : 'Pendiente'}
                                                    </p>
                                                </div>
                                            </div>

                                            {!p.hasPaid && (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={generatePaymentLink(p.name, costPerPerson)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                                        title="Enviar Cobro por WhatsApp"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            )}
                                            {p.hasPaid && (
                                                <div className="text-emerald-500 text-xs font-mono font-bold">
                                                    + S/ {costPerPerson.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                        <div className="p-4 bg-slate-900 border-t border-slate-800 text-center space-y-2">
                            <div className="flex justify-between items-center text-sm px-2">
                                <span className="text-slate-400">Total a Dividir:</span>
                                <span className="text-slate-200 font-bold">S/ {totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm px-2">
                                <span className="text-slate-400">Entre Adultos ({activePayingCount}):</span>
                                <span className="text-emerald-400 font-bold text-lg">S/ {activePayingCount > 0 ? (totalCost / activePayingCount).toFixed(2) : '0.00'} c/u</span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800/50">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Baby className="w-4 h-4 text-blue-400" />
                                    <span>Los Niños NO Pagan</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function BudgetTicker({ data }: { data: Dish[] }) {
    // Generate ticker items: Flattened view of dish totals
    const tickerItems = [...data, ...data, ...data]; // Triple for smoother loop on wide screens

    return (
        <div className="w-full bg-slate-900 border-b border-amber-500/30 overflow-hidden relative shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none"></div>

            <div className="flex items-center">
                <div className="bg-amber-500/10 text-amber-500 font-black px-4 py-3 flex items-center gap-2 border-r border-amber-500/20 z-20 shrink-0 backdrop-blur-sm">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    LIVE
                </div>

                <div className="overflow-hidden whitespace-nowrap py-3 mask-image-linear-gradient">
                    <motion.div
                        className="flex items-center gap-12 pl-4"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
                    >
                        {tickerItems.map((dish, i) => {
                            const total = dish.ingredients.reduce((acc, item) => acc + item.priceTotal, 0);
                            return (
                                <div key={`${dish.id}-${i}`} className="flex items-center gap-4 group cursor-pointer hover:scale-110 transition-transform">
                                    <Store className="w-6 h-6 text-slate-500 group-hover:text-amber-500 transition-colors" />
                                    <span className="text-slate-200 font-bold uppercase tracking-wide text-lg whitespace-nowrap drop-shadow-md">
                                        {dish.name}
                                    </span>
                                    <span className="bg-slate-800 text-amber-500 px-3 py-1 rounded-lg flex items-center gap-1 font-mono text-lg font-bold border border-slate-700 group-hover:border-amber-500/50 transition-colors shadow-lg shadow-black/50">
                                        S/ {total.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}



function IntroScreen() {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden"
        >
            {/* Background Image with Ken Burns Effect */}
            <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 4, ease: "easeOut" }}
                className="absolute inset-0 z-0"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30 z-10" />
                <img
                    src="/The_setting_should_2k_202602181455.jpeg"
                    alt="Intro"
                    className="w-full h-full object-cover opacity-60"
                />
            </motion.div>

            {/* Content Container */}
            <div className="relative z-20 flex flex-col items-center justify-center space-y-8">
                {/* Logo / Title Animation */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-center px-4"
                >
                    <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-2">
                        <Sparkles className="w-8 h-8 text-amber-500 animate-pulse hidden md:block" />
                        <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                            PRESUPUESTO <span className="text-amber-500">MIX</span>
                        </h1>
                        <Sparkles className="w-6 h-6 text-amber-500 animate-pulse md:hidden" />
                    </div>
                    <p className="text-slate-400 tracking-[0.3em] md:tracking-[0.5em] text-xs md:text-sm uppercase">Edición de Lujo</p>
                </motion.div>

                {/* "Generando Presupuesto" Text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                    <span className="text-lg md:text-2xl font-light text-slate-200 tracking-widest animate-pulse text-center px-4">
                        GENERANDO PRESUPUESTO...
                    </span>
                    <div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                </motion.div>

                {/* Loading Bar */}
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    transition={{ delay: 1.5, duration: 2, ease: "easeInOut" }}
                    className="h-1 bg-amber-500/50 rounded-full overflow-hidden relative"
                >
                    <motion.div
                        className="absolute inset-0 bg-amber-400 blur-[2px]"
                        animate={{ x: [-200, 200] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                </motion.div>
            </div>
        </motion.div>
    );
}

function CowFundModal({
    isOpen,
    onClose,
    onAdd,
    newFund,
    setNewFund
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: () => void;
    newFund: { name: string; target: string };
    setNewFund: (val: { name: string; target: string }) => void;
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col z-10"
                    >
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10">
                            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                <Gift className="w-5 h-5 text-amber-500" />
                                Nueva Vaca
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre del Capricho</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Whisky Blue Label"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-500 outline-none transition-colors"
                                    value={newFund.name}
                                    onChange={(e) => setNewFund({ ...newFund, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta a Juntar (S/)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-amber-500 outline-none transition-colors"
                                    value={newFund.target}
                                    onChange={(e) => setNewFund({ ...newFund, target: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={() => {
                                    onAdd();
                                    onClose();
                                }}
                                disabled={!newFund.name || !newFund.target}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                Crear Vaca
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function SeasonalityAlerts() {
    const alerts = Object.values(HISTORIC_DATA).filter(
        item => item.seasonality === 'best_time' || item.seasonality === 'banned' || item.seasonality === 'expensive'
    );

    if (alerts.length === 0) return null;

    return (
        <div className="mb-8">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Alertas de Mercado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {alerts.map((item) => (
                    <div
                        key={item.name}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${item.seasonality === 'best_time'
                            ? 'bg-emerald-900/20 border-emerald-500/30'
                            : item.seasonality === 'banned'
                                ? 'bg-red-900/20 border-red-500/30'
                                : 'bg-amber-900/20 border-amber-500/30'
                            }`}
                    >
                        <div className={`p-2 rounded-lg ${item.seasonality === 'best_time' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.seasonality === 'banned' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                            {item.seasonality === 'best_time' ? <Leaf className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${item.seasonality === 'best_time' ? 'text-emerald-200' : 'text-slate-200'
                                }`}>
                                {item.name}
                            </p>
                            <p className="text-xs text-slate-400 leading-tight">
                                {item.seasonalityMsg || (item.seasonality === 'best_time' ? 'Precio bajo histórico' : 'Precio elevado')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

