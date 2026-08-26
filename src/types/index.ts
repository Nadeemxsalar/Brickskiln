export interface DailyEntry {
  id: string;
  date: string;
  bricks: number;
  payeCount: number;
  customRatePerPaya?: number; // NAYA: Agar kisi specific date par alag rate dena ho
  kharcha: number;
  peshgi: number;
  remark?: string; 
  isLeave?: boolean; // NAYA: Chhutti track karne ke liye
}

export interface Bhatta {
  id: string;
  name: string;
}

export interface Labour {
  id: string;
  bhattaId: string; 
  name: string;
  phone: string;
  paya?: string; 
  ratePerThousand: number;
  ratePerPaya: number;     // Default Paye Rate
  totalBricks: number;
  totalPaye: number;
  totalKharcha: number;
  totalPeshgi: number;
  entries: DailyEntry[]; 
}