"use server";

import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const DB_FILE = path.join(process.cwd(), 'failed_items.json');
const KV_KEY = 'failed_items';

export async function saveFailedItem(item: { requester: string; name: string; quantity: string; price?: string }) {
    const newItem = {
        id: Date.now().toString(),
        ...item,
        timestamp: new Date().toISOString()
    };

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        // PRODUCTION: Use Vercel KV (Redis)
        try {
            await kv.lpush(KV_KEY, newItem);
            return { success: true, item: newItem };
        } catch (error) {
            console.error("Error saving to KV:", error);
            return { success: false, error: 'Failed to save item to KV' };
        }
    } else {
        // DEVELOPMENT: Use Local JSON File
        let items: any[] = [];
        if (fs.existsSync(DB_FILE)) {
            try {
                const data = fs.readFileSync(DB_FILE, 'utf8');
                items = JSON.parse(data);
            } catch (error) {
                console.error("Error reading local DB:", error);
                items = [];
            }
        }

        items.push(newItem);

        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2));
            return { success: true, item: newItem };
        } catch (error) {
            console.error("Error writing local DB:", error);
            return { success: false, error: 'Failed to save item locally' };
        }
    }
}

export async function getFailedItems() {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        // PRODUCTION: Use Vercel KV
        try {
            const items = await kv.lrange(KV_KEY, 0, -1);
            return items || [];
        } catch (error) {
            console.error("Error reading from KV:", error);
            return [];
        }
    } else {
        // DEVELOPMENT: Use Local JSON File
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
}
