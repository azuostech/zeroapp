export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum Tier {
  DESPERTAR = 'DESPERTAR',
  MOVIMENTO = 'MOVIMENTO',
  ACELERACAO = 'ACELERACAO',
  AUTOGOVERNO = 'AUTOGOVERNO'
}

export enum Phase {
  BOMBEIRO = 'BOMBEIRO',
  SOBREVIVENTE = 'SOBREVIVENTE',
  CONSTRUTOR = 'CONSTRUTOR',
  MULTIPLICADOR = 'MULTIPLICADOR'
}

export enum TransactionType {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA'
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tier: Tier;
  phase: Phase;
  coins: number;
  totalCoins: number;
}
