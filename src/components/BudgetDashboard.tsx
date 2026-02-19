"use client";

import React, { useState, useMemo, useEffect } from "react";
import { budgetData, Dish, Ingredient } from "@/data/budgetData";
import { INITIAL_PARTICIPANTS, Participant } from "@/data/participants";
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
    Check
} from "lucide-react";
import { saveFailedItem, getFailedItems, clearFailedItems } from "@/app/db";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    AreaChart, Area, CartesianGrid, Legend, ComposedChart, Line
} from 'recharts';
import { optimizeBudgetWithAI } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_PEOPLE_COUNT = 10;

export default function BudgetDashboard() {
    const [currentData, setCurrentData] = useState<Dish[]>(budgetData);
    const [isOptimized, setIsOptimized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showIntro, setShowIntro] = useState(true);

    // Intro Timer
    useEffect(() => {
        const timer = setTimeout(() => setShowIntro(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    // Missing Items State
    const [missingItems, setMissingItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ name: '', quantity: '', price: '', requester: '' });
    const [isSending, setIsSending] = useState(false);
    const [addedSuccess, setAddedSuccess] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Load initial missing items on mount
    useEffect(() => {
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

                            {/* Missing Items Section */}
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

                    </motion.div>
                )}

            </AnimatePresence>

            <ParticipantsModal
                isOpen={showParticipantsModal}
                onClose={() => setShowParticipantsModal(false)}
                participants={participants}
                onToggle={handleToggleParticipant}
                totalCost={totalCost}
                activePayingCount={activePayingCount}
            />
        </>
    );
}

// ... (Other components)



// ... (KpiCard, DishRow, IngredientRow, etc.) - These remain unchanged but are included for context context context

function ComparativeMarketAnalysis({ data }: { data: Dish[] }) {
    // Determine Top 10 Most Expensive Ingredients (Unit Price) to graph
    const allIngredients = data.flatMap(d => d.ingredients);

    // Sort by Total Price to find biggest impact items
    const topIngredients = [...allIngredients]
        .sort((a, b) => b.priceTotal - a.priceTotal)
        .slice(0, 10)
        .map(item => {
            const bestPrice = item.marketPrices.length > 0 ? Math.min(...item.marketPrices.map(m => m.price)) : item.priceUnit;
            // Best Market Name
            const bestMarket = item.marketPrices.find(m => m.price === bestPrice)?.marketName || "N/A";

            return {
                name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
                full_name: item.name,
                "Tu Precio": item.priceUnit,
                "Mercado Local": bestPrice, // Represents the optimized/best found
                best_market: bestMarket,
                savings: item.priceUnit - bestPrice
            };
        });

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-emerald-500" />
                        Curva de Oportunidad
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-2xl">
                        Visualización de precios unitarios de tus insumos más costosos frente a las mejores ofertas detectadas en mercados locales (Metro, Tottus, Mercado Central).
                        El área sombreada representa tu <span className="text-emerald-400 font-bold">margen de ahorro potencial</span>.
                    </p>
                </div>
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
                        <YAxis
                            stroke="#94a3b8"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ color: '#cbd5e1' }}
                            formatter={(value: number | undefined) => [value ? `S/ ${value.toFixed(2)}` : 'N/A', '']}
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

function DishRow({ dish, isExpanded, onToggle, isOptimized, onUpdate }: {
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

    return (
        <div className={`grid grid-cols-12 items-center p-3 rounded-lg text-sm gap-2 transition-colors duration-300 ${isCheaper ? 'bg-emerald-900/10 border border-emerald-500/20' : hasDiscount ? 'bg-red-900/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'hover:bg-slate-800/30 group'}`}>
            <div className="col-span-5 pr-2">
                <p className={`font-medium break-words ${hasDiscount ? 'text-red-400' : 'text-slate-300'}`}>{ingredient.name}</p>
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
    totalCost,
    activePayingCount
}: {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    onToggle: (id: string) => void;
    totalCost: number;
    activePayingCount: number;
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
                        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col z-10"
                    >
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10">
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
                                            `}>
                                                {p.isActive && <Check className="w-4 h-4 text-slate-900 stroke-[3]" />}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center border
                                                    ${p.isActive
                                                        ? (p.type === 'Adulto' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400')
                                                        : 'bg-slate-800 border-slate-700 text-slate-600'}
                                                `}>
                                                    {p.type === 'Niño' ? <Baby className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-base ${p.isActive ? 'text-slate-100' : 'text-slate-500'}`}>{p.name}</p>
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                                                        {p.type}
                                                        {p.isActive && (
                                                            <span className={p.type === 'Adulto' ? 'text-emerald-500' : 'text-blue-500'}>
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
                                                        S/ {activePayingCount > 0 ? (totalCost / activePayingCount).toFixed(2) : '0.00'}
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

