"use server";

import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

import { Resend } from 'resend';

const DB_FILE = path.join(process.cwd(), 'failed_items.json');
const KV_KEY = 'failed_items';

export async function saveFailedItem(item: { requester: string; name: string; quantity: string; price?: string }) {
    const newItem = {
        id: Date.now().toString(),
        ...item,
        timestamp: new Date().toISOString()
    };

    // Send Email Notification (Fire and Forget)
    if (process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: process.env.NOTIFICATION_EMAIL,
                subject: `🚨 Faltante: ${item.name}`,
                html: `
                    <h1>Nuevo Item Faltante Reportado</h1>
                    <p><strong>Producto:</strong> ${item.name}</p>
                    <p><strong>Cantidad:</strong> ${item.quantity}</p>
                    <p><strong>Solicitado por:</strong> ${item.requester}</p>
                    ${item.price ? `<p><strong>Precio Ref:</strong> S/ ${item.price}</p>` : ''}
                    <hr>
                    <p><small>Enviado desde Presupuesto Mix</small></p>
                `
            });
            console.log("Notificación enviada a", process.env.NOTIFICATION_EMAIL);
        } catch (error) {
            console.error("Error enviando correo:", error);
        }
    }

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

export async function clearFailedItems() {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        // PRODUCTION: Clear Vercel KV
        try {
            await kv.del(KV_KEY);
            return { success: true };
        } catch (error) {
            console.error("Error clearing KV:", error);
            return { success: false, error: 'Failed to clear KV' };
        }
    } else {
        // DEVELOPMENT: Clear Local JSON File
        try {
            if (fs.existsSync(DB_FILE)) {
                fs.writeFileSync(DB_FILE, '[]');
            }
            return { success: true };
        } catch (error) {
            console.error("Error clearing local DB:", error);
            return { success: false, error: 'Failed to clear local DB' };
        }
    }
}

const COW_FUND_DB_FILE = path.join(process.cwd(), 'cow_funds.json');
const COW_FUND_KV_KEY = 'cow_funds';

export async function saveCowFunds(funds: any[]) {
    // DEVELOPMENT: Local File System
    if (process.env.NODE_ENV !== 'production' && !process.env.KV_REST_API_URL) {
        try {
            fs.writeFileSync(COW_FUND_DB_FILE, JSON.stringify(funds, null, 2));
            return { success: true };
        } catch (error) {
            console.error("Error writing local cow fund DB:", error);
            return { success: false };
        }
    }

    // PRODUCTION: Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            await kv.set(COW_FUND_KV_KEY, funds);
            return { success: true };
        } catch (error) {
            console.error("Error saving cow funds to KV:", error);
            return { success: false };
        }
    }

    return { success: false };
}

export async function getCowFunds() {
    // DEVELOPMENT: Local File System
    if (process.env.NODE_ENV !== 'production' && !process.env.KV_REST_API_URL) {
        if (!fs.existsSync(COW_FUND_DB_FILE)) return [];
        try {
            const data = fs.readFileSync(COW_FUND_DB_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    // PRODUCTION: Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            const funds = await kv.get(COW_FUND_KV_KEY);
            return (funds as any[]) || [];
        } catch (error) {
            console.error("Error reading cow funds from KV:", error);
            return [];
        }
    }

    return [];
}

export async function clearCowFundsData() {
    // DEVELOPMENT: Local File System
    if (process.env.NODE_ENV !== 'production' && !process.env.KV_REST_API_URL) {
        try {
            if (fs.existsSync(COW_FUND_DB_FILE)) {
                fs.writeFileSync(COW_FUND_DB_FILE, '[]');
            }
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    // PRODUCTION: Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            await kv.del(COW_FUND_KV_KEY);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    return { success: false };
}
