import bcrypt from 'bcryptjs';
import { Phase, PrismaClient, Tier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Zero@2025', 10);

  await prisma.user.upsert({
    where: { email: 'admin@zero.app' },
    update: { name: 'Admin ZERO', password, role: 'ADMIN', tier: Tier.AUTOGOVERNO, isActive: true },
    create: {
      name: 'Admin ZERO',
      email: 'admin@zero.app',
      password,
      role: 'ADMIN',
      tier: Tier.AUTOGOVERNO,
      phase: 'MULTIPLICADOR',
      coins: 3000,
      totalCoins: 3000,
      isActive: true
    }
  });

  const badges = [
    { key: 'primeiro_lancamento', name: 'Primeiro passo dado', description: 'Primeiro lançamento registrado', icon: '🚀' },
    { key: 'primeiro_mes_completo', name: 'Mês fechado', description: 'Fechou um mês completo', icon: '📅' },
    { key: 'divida_quitada', name: 'Dívida zerada', description: 'Quitou uma dívida', icon: '💳' },
    { key: 'meta_concluida', name: 'Sonho realizado', description: 'Concluiu uma meta', icon: '🎯' },
    { key: 'primeiro_investimento', name: 'Investidor', description: 'Fez primeiro investimento', icon: '📈' },
    { key: 'sequencia_3_meses', name: '3 meses seguidos', description: 'Manteve sequência de 3 meses', icon: '🔥' },
    { key: 'multiplicador', name: 'Chegou ao topo', description: 'Chegou na fase multiplicador', icon: '👑' },
    { key: 'indicacao', name: 'Trouxe um amigo', description: 'Indicou um amigo que entrou', icon: '🤝' }
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({ where: { key: badge.key }, update: badge, create: badge });
  }

  const missions = [
    { key: 'bombeiro_entrada', name: 'Cadastrar primeira entrada', description: 'Registre sua primeira entrada', phase: Phase.BOMBEIRO, coinReward: 30 },
    { key: 'bombeiro_saida', name: 'Cadastrar primeira saída', description: 'Registre sua primeira saída', phase: Phase.BOMBEIRO, coinReward: 30 },
    { key: 'bombeiro_dashboard', name: 'Ver dashboard completo', description: 'Acesse o dashboard financeiro', phase: Phase.BOMBEIRO, coinReward: 20 },
    { key: 'sobrevivente_divida', name: 'Mapear 1 dívida', description: 'Cadastre ao menos uma dívida', phase: Phase.SOBREVIVENTE, coinReward: 50 },
    { key: 'sobrevivente_meta', name: 'Criar primeira meta', description: 'Cadastre uma meta de sonho', phase: Phase.SOBREVIVENTE, coinReward: 50 },
    { key: 'sobrevivente_mes', name: 'Fechar 1 mês completo', description: 'Preencha 1 mês completo', phase: Phase.SOBREVIVENTE, coinReward: 100 },
    { key: 'construtor_quitar', name: 'Quitar uma dívida', description: 'Marque uma dívida como quitada', phase: Phase.CONSTRUTOR, coinReward: 120 },
    { key: 'construtor_3meses', name: 'Manter 3 meses ativos', description: 'Três meses consecutivos', phase: Phase.CONSTRUTOR, coinReward: 150 },
    { key: 'construtor_reserva', name: 'Meta reserva emergência', description: 'Crie meta de reserva', phase: Phase.CONSTRUTOR, coinReward: 90 },
    { key: 'multiplicador_investimento', name: 'Primeiro investimento', description: 'Cadastre investimento inicial', phase: Phase.MULTIPLICADOR, coinReward: 120 },
    { key: 'multiplicador_meta100', name: 'Atingir 100% da meta', description: 'Concluir uma meta', phase: Phase.MULTIPLICADOR, coinReward: 160 },
    { key: 'multiplicador_indicacao', name: 'Indicar amigo cadastrado', description: 'Convide um amigo', phase: Phase.MULTIPLICADOR, coinReward: 140 }
  ];

  for (const mission of missions) {
    await prisma.mission.upsert({ where: { key: mission.key }, update: mission, create: mission });
  }

  const codes = [
    { code: 'WORKSHOP-001', tier: Tier.MOVIMENTO, coinBonus: 500 },
    { code: 'WORKSHOP-002', tier: Tier.MOVIMENTO, coinBonus: 500 },
    { code: 'WORKSHOP-003', tier: Tier.MOVIMENTO, coinBonus: 500 }
  ];

  for (const c of codes) {
    await prisma.workshopCode.upsert({ where: { code: c.code }, update: c, create: c });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
