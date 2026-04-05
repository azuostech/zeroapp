export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: 'USER' | 'ADMIN';
  tier: 'DESPERTAR' | 'MOVIMENTO' | 'ACELERACAO' | 'AUTOGOVERNO';
  phase: 'BOMBEIRO' | 'SOBREVIVENTE' | 'CONSTRUTOR' | 'MULTIPLICADOR';
  coins: number;
  totalCoins: number;
  showInRanking: boolean;
  referralCode: string;
}
