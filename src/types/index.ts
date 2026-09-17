
export interface Transaction {
  id: string;
  type: 'credit' | 'payment';
  amount: number;
  description: string;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  image: string; // Base64 data URI
  creditLimit: number;
  balance: number; // Positive means outstanding credit, negative means surplus
  transactions: Transaction[];
  createdAt: string;
}



export interface BusinessProfile {
  name: string;
  ownerEmail: string;
  category: string;
  contact: string;
  address: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  businessName: string;
  role: 'owner';
}
