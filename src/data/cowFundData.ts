
import { Participant } from "@/data/participants";

export interface CowFundItem {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    contributors: Contributor[];
    status: 'active' | 'completed';
}

export interface Contributor {
    id: string;
    participantId: string;
    name: string;
    amount: number;
    timestamp: string;
}

export const INITIAL_COW_FUNDS: CowFundItem[] = [
    {
        id: 'cow-1',
        name: 'Whisky Blue Label',
        targetAmount: 850.00,
        currentAmount: 150.00,
        status: 'active',
        contributors: [
            { id: 'c-1', participantId: '1', name: 'Pepocho', amount: 100.00, timestamp: new Date().toISOString() },
            { id: 'c-2', participantId: '5', name: 'Feny', amount: 50.00, timestamp: new Date().toISOString() }
        ]
    }
];
