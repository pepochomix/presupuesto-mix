
// Mock market data generator
// AI Market Analysis Generator
// Simulates real-time crawling of Peruvian supermarket prices
const generateAIMarketPrices = (basePrice: number, category: 'produce' | 'meat' | 'dry' | 'alcohol' | 'other' = 'other') => {
    // Market Profiles with "AI" predicted variance
    const markets = [
        { name: "Makro", type: 'wholesale', variance: 0.85, dealChance: 0.4 },      // Bulk savings
        { name: "Mercado Mayorista", type: 'market', variance: 0.75, dealChance: 0.1 }, // Raw cheapness
        { name: "Plaza Vea", type: 'retail', variance: 1.00, dealChance: 0.3 },     // Standard
        { name: "Metro", type: 'retail', variance: 0.98, dealChance: 0.3 },         // Standard cheap
        { name: "Tottus", type: 'retail', variance: 0.95, dealChance: 0.4 },        // Good deals
        { name: "Vivanda", type: 'premium', variance: 1.25, dealChance: 0.15 },     // Premium
        { name: "Wong", type: 'premium', variance: 1.30, dealChance: 0.2 },         // Premium
    ];

    return markets.map(m => {
        let price = basePrice * m.variance;

        // "AI" detects category-specifc variations
        if (category === 'produce' && m.type === 'market') price *= 0.8; // Markets cheap for veg
        if (category === 'meat' && m.type === 'wholesale') price *= 0.9; // Makro cheap for meat
        if (category === 'alcohol' && m.type === 'retail') price *= 0.95; // Supermarkets compete on beer

        // Simulate "Live Deals" (e.g., Cyber Days, Cierrapuertas)
        if (Math.random() < m.dealChance) {
            price *= 0.9; // 10% extra off
        }

        // Add small random noise for realism
        price = price + (Math.random() * 0.5 - 0.25);

        return {
            marketName: m.name,
            price: parseFloat(price.toFixed(2))
        };
    }).sort((a, b) => a.price - b.price); // Sort so AI picks best easily
};

export interface Ingredient {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    priceUnit: number; // Base price from user
    priceTotal: number;
    observations?: string;
    marketPrices: { marketName: string; price: number }[];
    discount?: number;
}

export interface Dish {
    id: string;
    name: string;
    image?: string;
    ingredients: Ingredient[];
}

export const budgetData: Dish[] = [
    {
        id: "dish-1",
        name: "Causa de Pulpa de Cangrejo Centolla Fuente",
        image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?q=80&w=600&auto=format&fit=crop", // Causa Limeña style
        ingredients: [
            { id: "i1-1", name: "Papa Amarilla", quantity: 4, unit: "Kilos", priceUnit: 5.00, priceTotal: 20.00, observations: "La chicas ayudan a prensar las Papas", marketPrices: generateAIMarketPrices(5.00, 'produce') },
            { id: "i1-2", name: "Aji Amarillo", quantity: 1, unit: "Kilos", priceUnit: 14.00, priceTotal: 14.00, observations: "medio kilo para la causa medio kilo para la Huancaina", marketPrices: generateAIMarketPrices(14.00, 'produce') },
            { id: "i1-3", name: "Limon", quantity: 1, unit: "Kilos", priceUnit: 7.00, priceTotal: 7.00, marketPrices: generateAIMarketPrices(7.00, 'produce') },
            { id: "i1-4", name: "Palta", quantity: 1, unit: "Kilo", priceUnit: 12.00, priceTotal: 12.00, marketPrices: generateAIMarketPrices(12.00, 'produce') },
            { id: "i1-5", name: "Pulpa de Cangrejo Centolla", quantity: 0.5, unit: "Kilos", priceUnit: 0, priceTotal: 0, observations: "Fernando Calderon", marketPrices: [] }, // Price 0
            { id: "i1-6", name: "Pimientos", quantity: 2, unit: "Unid", priceUnit: 3.00, priceTotal: 6.00, marketPrices: generateAIMarketPrices(3.00, 'produce') },
            { id: "i1-7", name: "Nuez Moscada", quantity: 1, unit: "Unid", priceUnit: 2.00, priceTotal: 2.00, marketPrices: generateAIMarketPrices(2.00, 'dry') },
        ]
    },
    {
        id: "dish-2",
        name: "Caja China",
        image: "https://i.ibb.co/K2x6x4z/caja-china-cerdo.jpg", // Optimized Image for Caja China
        ingredients: [
            { id: "i2-1", name: "Panceta de cerdo con piel y sin hueso", quantity: 4, unit: "Kilos", priceUnit: 43.80, priceTotal: 175.20, observations: "Viernes 20% descuento", marketPrices: generateAIMarketPrices(43.80, 'meat') },
            { id: "i2-2", name: "Chorizo Finas Hierbas para Picar", quantity: 1, unit: "Kilos", priceUnit: 32.00, priceTotal: 32.00, observations: "medio kilo para la causa medio kilo para la Huancaina", marketPrices: generateAIMarketPrices(32.00, 'meat') },
            { id: "i2-3", name: "Cerveza Negra", quantity: 1, unit: "botella", priceUnit: 7.00, priceTotal: 7.00, marketPrices: generateAIMarketPrices(7.00, 'alcohol') },
            { id: "i2-4", name: "Pack Tomillo Huacatay Anis Estrella y Hierba Buena", quantity: 1, unit: "Pack 300 gr", priceUnit: 7.00, priceTotal: 7.00, marketPrices: generateAIMarketPrices(7.00, 'produce') },
            { id: "i2-5", name: "Naranja", quantity: 1, unit: "500 gr", priceUnit: 4.00, priceTotal: 4.00, marketPrices: generateAIMarketPrices(4.00, 'produce') },
            { id: "i2-6", name: "Sal normal y Sal Gruesa", quantity: 2, unit: "Kilos", priceUnit: 7.00, priceTotal: 14.00, marketPrices: generateAIMarketPrices(7.00, 'dry') },
            { id: "i2-7", name: "Laurel", quantity: 1, unit: "50 gr", priceUnit: 2.00, priceTotal: 2.00, marketPrices: generateAIMarketPrices(2.00, 'dry') },
            { id: "i2-8", name: "Pimienta, Comino Vinagre Balsamico", quantity: 1, unit: "250 gr", priceUnit: 14.00, priceTotal: 14.00, marketPrices: generateAIMarketPrices(14.00, 'dry') },
            { id: "i2-9", name: "Camote Amarillo", quantity: 2, unit: "Kilos", priceUnit: 3.50, priceTotal: 7.00, observations: "Viernes 20% descuento", marketPrices: generateAIMarketPrices(3.50, 'produce') },
        ]
    },
    {
        id: "dish-3",
        name: "Insumos Necesarios",
        image: "https://images.unsplash.com/photo-1541592106381-b31e9674c96b?q=80&w=600&auto=format&fit=crop", // Ajo Professional / Kitchen Vibe
        ingredients: [
            { id: "i3-2", name: "Ajo Toro Chimi Mix con Aceite de Oliva", quantity: 1, unit: "Frasco", priceUnit: 32.00, priceTotal: 32.00, observations: "Costo Para Sazonar Chancho y comer con chorizos etc", marketPrices: generateAIMarketPrices(32.00, 'dry') },
            { id: "i3-3", name: "Aceite Primor", quantity: 1, unit: "Litro", priceUnit: 12.00, priceTotal: 12.00, marketPrices: generateAIMarketPrices(12.00, 'dry') },
            { id: "i3-4", name: "Clavo de Olor", quantity: 1, unit: "50 gr", priceUnit: 2.50, priceTotal: 2.50, marketPrices: generateAIMarketPrices(2.50, 'dry') },
            { id: "i3-5", name: "Margarina Dorina", quantity: 1, unit: "100 gr", priceUnit: 5.50, priceTotal: 5.50, marketPrices: generateAIMarketPrices(5.50, 'dry') },
            { id: "i3-6", name: "Miel de Abeja", quantity: 1, unit: "200 gr", priceUnit: 8.00, priceTotal: 8.00, marketPrices: generateAIMarketPrices(8.00, 'dry') },
        ]
    },

    {
        id: "dish-5",
        name: "Piqueos y Otros",
        image: "https://images.unsplash.com/photo-1541592106381-b31e9674c96b?q=80&w=600&auto=format&fit=crop",
        ingredients: [
            { id: "i4-4", name: "Queso Paria o Huarochiri", quantity: 1, unit: "400 gr", priceUnit: 12.00, priceTotal: 12.00, observations: "HuacaMix", marketPrices: generateAIMarketPrices(12.00, 'other') },
            { id: "i4-5", name: "Carbon de preferencia Briketa", quantity: 1, unit: "5 Kilos", priceUnit: 30.00, priceTotal: 30.00, observations: "Carbon", marketPrices: generateAIMarketPrices(30.00, 'other') },
            { id: "i4-6", name: "Everest", quantity: 2, unit: "Litros", priceUnit: 6.00, priceTotal: 12.00, observations: "Bebidas / Agua", marketPrices: generateAIMarketPrices(6.00, 'alcohol') },
            { id: "i4-7", name: "Papel Toalla", quantity: 2, unit: "rollos", priceUnit: 3.00, priceTotal: 6.00, marketPrices: generateAIMarketPrices(3.00, 'dry') },
            { id: "i4-8", name: "Papa Coctelera", quantity: 2, unit: "Kilos", priceUnit: 6.00, priceTotal: 12.00, marketPrices: generateAIMarketPrices(6.00, 'produce') },
        ]
    }
];

export type SeasonalityStatus = 'best_time' | 'normal' | 'expensive' | 'banned' | 'out_of_stock';

export interface HistoricItem {
    name: string;
    lastPrice: number; // Price per unit in the previous event
    seasonality: SeasonalityStatus;
    seasonalityMsg?: string;
}

// Mock Database of Historic Prices and Seasons
export const HISTORIC_DATA: Record<string, HistoricItem> = {
    "Panceta de cerdo con piel y sin hueso": {
        name: "Panceta de cerdo",
        lastPrice: 38.00, // Was cheaper before
        seasonality: 'normal'
    },
    "Limon": {
        name: "Limon",
        lastPrice: 5.00, // Inflation!
        seasonality: 'expensive',
        seasonalityMsg: "Escasez por lluvias"
    },
    "Papa Amarilla": {
        name: "Papa Amarilla",
        lastPrice: 5.50,
        seasonality: 'best_time',
        seasonalityMsg: "Cosecha en la sierra"
    },
    "Bonito": {
        name: "Bonito",
        lastPrice: 8.00,
        seasonality: 'best_time',
        seasonalityMsg: "Alerta: Pesca abundante, precio bajo histórico"
    },
    "Lenguado": {
        name: "Lenguado",
        lastPrice: 80.00,
        seasonality: 'banned',
        seasonalityMsg: "En veda reproductiva. Prohibido su consumo."
    },
    "Lomo Fino": {
        name: "Lomo Fino",
        lastPrice: 55.00,
        seasonality: 'expensive',
        seasonalityMsg: "Subió 15% respecto a la parrilla anterior"
    },
    "Palta": {
        name: "Palta",
        lastPrice: 10.00,
        seasonality: 'normal'
    },
    "Cerveza Negra": {
        name: "Cerveza Negra",
        lastPrice: 6.50,
        seasonality: 'normal'
    }
};
