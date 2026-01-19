
export type Payer = string; // Now dynamic, though 'Quỹ' is special

export interface SessionItem {
  court: number;
  water: number;
  shuttle: number;
}

export interface SessionPayers {
  court: Payer;
  water: Payer;
  shuttle: Payer;
}

export interface BadmintonSession {
  id: string;
  date: string;
  payers: SessionPayers;
  costs: SessionItem;
  isPrepaid: {
    court: boolean;
    water: boolean;
    shuttle: boolean;
  };
  participants: string[]; // Danh sách người tham gia buổi chơi
  note?: string;
}

export interface FundTransaction {
  id: string;
  date: string;
  amount: number;
  payer: Payer; // Added to track who paid
  type: 'CONTRIBUTION' | 'PREPAID_PURCHASE' | 'EXPENSE';
  description: string;
  category?: 'court' | 'water' | 'shuttle' | 'general';
}

export interface AppState {
  sessions: BadmintonSession[];
  fundTransactions: FundTransaction[];
  members: string[];
}
