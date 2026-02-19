
// Mock market data generator
const generateMarketPrices = (basePrice: number) => {
    const markets = [
        { name: "Metro", variance: 0.95 },   // slightly cheaper
        { name: "Plaza Vea", variance: 1.05 }, // slightly more expensive
        { name: "Tottus", variance: 0.9 },     // noticeably cheaper
        { name: "Vivanda", variance: 1.2 },    // premium
        { name: "Mercado Central", variance: 0.7 } // very cheap
    ];

    return markets.map(m => ({
        marketName: m.name,
        price: parseFloat((basePrice * (m.variance + (Math.random() * 0.1 - 0.05))).toFixed(2))
    }));
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
            { id: "i1-1", name: "Papa Amarilla", quantity: 5, unit: "Kilos", priceUnit: 5.00, priceTotal: 25.00, observations: "La chicas ayudan a prensar las Papas", marketPrices: generateMarketPrices(5.00) },
            { id: "i1-2", name: "Aji Amarillo", quantity: 1, unit: "Kilos", priceUnit: 14.00, priceTotal: 14.00, observations: "medio kilo para la causa medio kilo para la Huancaina", marketPrices: generateMarketPrices(14.00) },
            { id: "i1-3", name: "Limon", quantity: 1, unit: "Kilos", priceUnit: 7.00, priceTotal: 7.00, marketPrices: generateMarketPrices(7.00) },
            { id: "i1-4", name: "Palta", quantity: 1, unit: "Kilo", priceUnit: 12.00, priceTotal: 12.00, marketPrices: generateMarketPrices(12.00) },
            { id: "i1-5", name: "Pulpa de Cangrejo Centolla", quantity: 0.5, unit: "Kilos", priceUnit: 0, priceTotal: 0, observations: "Fernando Calderon", marketPrices: [] }, // Price 0
            { id: "i1-6", name: "Pimientos", quantity: 2, unit: "Unid", priceUnit: 3.00, priceTotal: 6.00, marketPrices: generateMarketPrices(3.00) },
            { id: "i1-7", name: "Nuez Moscada", quantity: 1, unit: "Unid", priceUnit: 2.00, priceTotal: 2.00, marketPrices: generateMarketPrices(2.00) },
        ]
    },
    {
        id: "dish-2",
        name: "Caja China",
        image: "https://i.ibb.co/K2x6x4z/caja-china-cerdo.jpg", // Optimized Image for Caja China
        ingredients: [
            { id: "i2-1", name: "Panceta de cerdo con piel y sin hueso", quantity: 5, unit: "Kilos", priceUnit: 43.80, priceTotal: 219.00, observations: "Viernes 20% descuento", marketPrices: generateMarketPrices(43.80) },
            { id: "i2-2", name: "Chorizo Finas Hierbas para Picar", quantity: 1, unit: "Kilos", priceUnit: 32.00, priceTotal: 32.00, observations: "medio kilo para la causa medio kilo para la Huancaina", marketPrices: generateMarketPrices(32.00) },
            { id: "i2-3", name: "Cerveza Negra", quantity: 1, unit: "botella", priceUnit: 7.00, priceTotal: 7.00, marketPrices: generateMarketPrices(7.00) },
            { id: "i2-4", name: "Pack Tomillo Huacatay Anis Estrella y Hierba Buena", quantity: 1, unit: "Pack 300 gr", priceUnit: 7.00, priceTotal: 7.00, marketPrices: generateMarketPrices(7.00) },
            { id: "i2-5", name: "Naranja", quantity: 1, unit: "500 gr", priceUnit: 4.00, priceTotal: 4.00, marketPrices: generateMarketPrices(4.00) },
            { id: "i2-6", name: "Sal normal y Sal Gruesa", quantity: 2, unit: "Kilos", priceUnit: 7.00, priceTotal: 14.00, marketPrices: generateMarketPrices(7.00) },
            { id: "i2-7", name: "Laurel", quantity: 1, unit: "50 gr", priceUnit: 2.00, priceTotal: 2.00, marketPrices: generateMarketPrices(2.00) },
            { id: "i2-8", name: "Pimienta, Comino Vinagre Balsamico", quantity: 1, unit: "250 gr", priceUnit: 14.00, priceTotal: 14.00, marketPrices: generateMarketPrices(14.00) },
        ]
    },
    {
        id: "dish-3",
        name: "Insumos Necesarios",
        image: "https://images.unsplash.com/photo-1541592106381-b31e9674c96b?q=80&w=600&auto=format&fit=crop", // Ajo Professional / Kitchen Vibe
        ingredients: [
            { id: "i3-1", name: "Camote Amarillo", quantity: 3, unit: "Kilos", priceUnit: 3.50, priceTotal: 10.50, observations: "Viernes 20% descuento", marketPrices: generateMarketPrices(3.50) },
            { id: "i3-2", name: "Ajo Toro Chimi Mix con Aceite de Oliva", quantity: 1, unit: "Frasco", priceUnit: 32.00, priceTotal: 32.00, observations: "Costo Para Sazonar Chancho y comer con chorizos etc", marketPrices: generateMarketPrices(32.00) },
            { id: "i3-3", name: "Aceite Primor", quantity: 1, unit: "Litro", priceUnit: 12.00, priceTotal: 12.00, marketPrices: generateMarketPrices(12.00) },
            { id: "i3-4", name: "Clavo de Olor", quantity: 1, unit: "50 gr", priceUnit: 2.50, priceTotal: 2.50, marketPrices: generateMarketPrices(2.50) },
            { id: "i3-5", name: "Margarina Dorina", quantity: 1, unit: "100 gr", priceUnit: 5.50, priceTotal: 5.50, marketPrices: generateMarketPrices(5.50) },
            { id: "i3-6", name: "Miel de Abeja", quantity: 1, unit: "200 gr", priceUnit: 8.00, priceTotal: 8.00, marketPrices: generateMarketPrices(8.00) },
        ]
    },
    {
        id: "dish-4",
        name: "Ensalada de Col",
        image: "https://images.unsplash.com/photo-1629858607106-a833534d0263?q=80&w=600&auto=format&fit=crop",
        ingredients: [
            { id: "i4-1", name: "Col Grande", quantity: 1, unit: "Kilos", priceUnit: 3.50, priceTotal: 3.50, observations: "Viernes 20% descuento", marketPrices: generateMarketPrices(3.50) },
            { id: "i4-2", name: "Piña Golden", quantity: 1, unit: "Frasco", priceUnit: 13.00, priceTotal: 13.00, observations: "Costo Para Sazonar Chancho y comer con chorizos etc", marketPrices: generateMarketPrices(13.00) },
            { id: "i4-3", name: "Pecanas", quantity: 1, unit: "200 gr", priceUnit: 8.00, priceTotal: 8.00, marketPrices: generateMarketPrices(8.00) },
            { id: "i4-9", name: "Queso cortado edan", quantity: 1, unit: "50 gr", priceUnit: 15.00, priceTotal: 15.00, marketPrices: generateMarketPrices(15.00) },
            { id: "i4-10", name: "Tocino", quantity: 1, unit: "100 gr", priceUnit: 10.00, priceTotal: 10.00, marketPrices: generateMarketPrices(10.00) },
            { id: "i4-11", name: "Pasas Negras", quantity: 1, unit: "120 gr", priceUnit: 6.00, priceTotal: 6.00, marketPrices: generateMarketPrices(6.00) },
            { id: "i4-12", name: "Yogurt Natural / Mayonesa", quantity: 1, unit: "Frasco", priceUnit: 12.00, priceTotal: 12.00, observations: "Base para aliño", marketPrices: generateMarketPrices(12.00) },
        ]
    },
    {
        id: "dish-5",
        name: "Piqueos y Otros",
        image: "https://images.unsplash.com/photo-1541592106381-b31e9674c96b?q=80&w=600&auto=format&fit=crop",
        ingredients: [
            { id: "i4-4", name: "Queso Paria o Huarochiri", quantity: 1, unit: "400 gr", priceUnit: 12.00, priceTotal: 12.00, observations: "HuacaMix", marketPrices: generateMarketPrices(12.00) },
            { id: "i4-5", name: "Carbon de preferencia Briketa", quantity: 1, unit: "5 Kilos", priceUnit: 30.00, priceTotal: 30.00, observations: "Carbon", marketPrices: generateMarketPrices(30.00) },
            { id: "i4-6", name: "Everest", quantity: 3, unit: "Litros", priceUnit: 6.00, priceTotal: 18.00, observations: "Bebidas / Agua", marketPrices: generateMarketPrices(6.00) },
            { id: "i4-7", name: "Papel Toalla", quantity: 2, unit: "rollos", priceUnit: 3.00, priceTotal: 6.00, marketPrices: generateMarketPrices(3.00) },
            { id: "i4-8", name: "Alitas de Pollo Niños y piqueo", quantity: 1, unit: "1 Kilo", priceUnit: 18.00, priceTotal: 18.00, marketPrices: generateMarketPrices(18.00) },
        ]
    }
];
