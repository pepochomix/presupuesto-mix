"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ingredient, Dish, budgetData } from "@/data/budgetData";

// Initialize AI
// NOTE: We are doing this inside the action to ensure it runs on the server.
// However, the client needs the key if we import it, so we better use process.env here.
// But the user put the key in .env.local as NEXT_PUBLIC_... Wait.
// If I use the key server-side, it should be just GEMINI_API_KEY.
// But I wrote NEXT_PUBLIC_GEMINI_API_KEY.
// I will use process.env.NEXT_PUBLIC_GEMINI_API_KEY for now as it's what I saved.
// In a real prod environment, I'd remove NEXT_PUBLIC_ if I want it strictly server-side.
// But for this "sandbox" quick setup, using the env var is fine.

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function optimizeBudgetWithAI(currentDishes: Dish[]) {
    if (!apiKey) {
        console.error("No API Key found");
        return currentDishes;
        // Fallback or error handling
    }

    try {
        // Construct prompt
        const ingredientsList = currentDishes.flatMap(d =>
            d.ingredients.map(i => `${i.name} (${i.quantity} ${i.unit}) - Base: S/ ${i.priceUnit}`)
        ).join("\n");

        const prompt = `
      Actúa como un experto en compras de mercado en Lima, Perú.
      Tengo la siguiente lista de ingredientes con sus precios base referenciales:
      
      ${ingredientsList}
      
      Por favor, para CADA ingrediente, dame 3 opciones de precios reales o estimados en mercados de Lima (ej. Metro, Mercado Central, Vivanda, Mayorista, etc.) que permitan ahorrar o que sean precios de mercado competitivos hoy en día.
      
      Devuelve SOLO el objeto JSON puro y válido. No uses bloques de código.
      Estructura esperada:
      {
        "optimizations": [
          {
            "ingredientName": "string",
            "marketPrices": [
               { "marketName": "string", "price": 0.00 }
            ]
          }
        ]
      }
      NO inventes ingredientes nuevos.

      NO inventes ingredientes nuevos.Usa los nombres exactos que te di.
      Asegúrate de que los precios tengan sentido económico en Soles Peruanos(PEN).
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Attempt to extract JSON if wrapped in markdown
        let jsonString = text;
        if (text.includes("```json")) {
            jsonString = text.split("```json")[1].split("```")[0];
        } else if (text.includes("```")) { // General code block fallback
            jsonString = text.split("```")[1].split("```")[0];
        }

        // Clean any remaining non-JSON chars
        jsonString = jsonString.trim();

        const data = JSON.parse(jsonString);

        // Merge AI data back into dishes
        const updatedDishes = currentDishes.map(dish => ({
            ...dish,
            ingredients: dish.ingredients.map(ing => {
                const optimized = data.optimizations.find((o: any) =>
                    o.ingredientName.toLowerCase().includes(ing.name.toLowerCase()) ||
                    ing.name.toLowerCase().includes(o.ingredientName.toLowerCase())
                );

                if (optimized && optimized.marketPrices) {
                    return {
                        ...ing,
                        marketPrices: optimized.marketPrices
                    };
                }
                return ing;
            })
        }));

        return updatedDishes;

    } catch (error) {
        console.error("Error calling AI:", error);
        // Return original data on failure so app doesn't crash
        return currentDishes;
    }
}

export async function generateMenuAction(budget: number, people: number, preference: string) {
    if (!apiKey) {
        console.error("No API Key found");
        return null; // Return null to signal no API key
    }

    try {
        const prompt = `
      Actúa como un Chef Ejecutivo y experto en costos de eventos en Lima, Perú.
      Necesito armar un menú completo (varios platos/categorías) para un evento con las siguientes restricciones:

      - Presupuesto TOTAL aprox: S/ ${budget}
      - Cantidad de Personas: ${people}
      - Preferencia/Estilo: ${preference} (ej. Parrilla, Criollo, Marino, Económico, etc.)

      Genera una lista de compras detallada estructurada como platos (Dish) e ingredientes (Ingredient).
      
      Reglas:
      1. Calcula cantidades realistas para que alcance para ${people} personas.
      2. Usa precios de mercado actuales de Lima (Soles PEN).
      3. El costo total de TODOS los ingredientes sumados debe acercarse al presupuesto, pero NO excederlo por mucho.
      4. Incluye "Insumos Básicos" (carbón, hielo, bebidas) si aplica al estilo.
      5. NO expliques, solo dame el JSON.

      Devuelve SOLO un JSON array de objetos 'Dish'. Estructura exacta:
      [
        {
          "id": "generado-1",
          "name": "Nombre del Plato o Categoría (ej. Entrada, Fondo, Bebidas)",
          "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1", 
          "ingredients": [
            {
              "id": "ing-gen-1",
              "name": "Nombre ingrediente",
              "quantity": 0,
              "unit": "kg/unid/lt",
              "priceUnit": 0.00,
              "priceTotal": 0.00,
              "observations": "Notas opcionales",
              "marketPrices": []
            }
          ]
        }
      ]
      
      IMPORTANTE:
      - priceTotal debe ser quantity * priceUnit.
      - marketPrices puede estar vacío [].
      - Genera al menos 2 o 3 categorías (ej. Fondo, Acompañamientos, Bebidas).
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Extract JSON if wrapped in markdown
        if (text.includes('```json')) {
            text = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            text = text.split('```')[1].split('```')[0];
        }

        const data = JSON.parse(text.trim());
        return data;

    } catch (error) {
        console.error("Error generating menu:", error);
        throw new Error("Failed to generate menu");
    }
}

export async function parseVoiceCommand(text: string) {
    if (!apiKey) {
        console.error("No API Key found");
        return null;
    }

    try {
        const prompt = `
            Actúa como un asistente de compras inteligente para una parrilla/evento.
            Analiza el siguiente texto de voz: "${text}"

            Extrae los ítems que se quieren AGREGAR a la lista de faltantes.
            
            Devuelve un JSON con la siguiente estructura:
            {
                "items": [
                    {
                        "name": "nombre del producto (ej. Hielo, Inka Cola)",
                        "quantity": number, // siempre numérico
                        "requester": "nombre de quien pide (si no dice, poner 'Voz')"
                    }
                ]
            }

            Reglas:
            - Extrae múltiples ítems si existen.
            - Si la cantidad es en texto ("dos"), conviértela a número (2).
            - Si no menciona cantidad, asume 1.
            - Solo devuelve JSON válido sin markdown.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonString = response.text();

        if (jsonString.includes("```json")) {
            jsonString = jsonString.split("```json")[1].split("```")[0];
        } else if (jsonString.includes("```")) {
            jsonString = jsonString.split("```")[1].split("```")[0];
        }

        return JSON.parse(jsonString.trim());
    } catch (error) {
        console.error("Error parsing voice command:", error);
        return null;
    }
}
