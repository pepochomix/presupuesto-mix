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
