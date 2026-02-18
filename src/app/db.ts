"use server";

import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'failed_items.json');

export async function saveFailedItem(item: { requester: string; name: string; quantity: string; price?: string }) {
    let items = [];

    // Check if file exists
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            items = JSON.parse(data);
        } catch (error) {
            console.error("Error reading database:", error);
            items = []; // Reset if corrupted
        }
    }

    const newItem = {
        id: Date.now().toString(),
        ...item,
        timestamp: new Date().toISOString()
    };

    items.push(newItem);

    // Save back to file
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2));
        return { success: true, item: newItem };
    } catch (error) {
        console.error("Error writing database:", error);
        return { success: false, error: 'Failed to save item' };
    }
}

export async function getFailedItems() {
    if (!fs.existsSync(DB_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading database:", error);
        return [];
    }
}
