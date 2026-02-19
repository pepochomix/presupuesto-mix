export type ParticipantType = 'Adulto' | 'Niño';


export interface Participant {
    id: string;
    name: string;
    type: ParticipantType;
    isActive: boolean;
    hasPaid?: boolean;
}

export const INITIAL_PARTICIPANTS: Participant[] = [
    { id: '1', name: 'Pepocho', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '2', name: 'Chiky', type: 'Adulto', isActive: false, hasPaid: false },
    { id: '3', name: 'Thiago', type: 'Niño', isActive: true, hasPaid: false },
    { id: '4', name: 'Facundo', type: 'Niño', isActive: true, hasPaid: false },
    { id: '5', name: 'Feny', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '6', name: 'Lucy Pollito', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '7', name: 'Mikela', type: 'Niño', isActive: true, hasPaid: false },
    { id: '8', name: 'Kyara', type: 'Adulto', isActive: false, hasPaid: false },
    { id: '9', name: 'Enamorado Kyara', type: 'Adulto', isActive: false, hasPaid: false },
    { id: '10', name: 'Fernando Calderon', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '11', name: 'Amiga Fernando', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '12', name: 'Aldo', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '13', name: 'Pilar', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '14', name: 'Gaby la Patrona', type: 'Adulto', isActive: true, hasPaid: false },
    { id: '15', name: 'Momo', type: 'Adulto', isActive: false, hasPaid: false },
    { id: '16', name: 'Chana', type: 'Adulto', isActive: false, hasPaid: false },
    { id: '17', name: 'Valentina', type: 'Niño', isActive: false, hasPaid: false },
    { id: '18', name: 'Francesca', type: 'Niño', isActive: false, hasPaid: false },
];

