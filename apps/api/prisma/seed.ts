import bcrypt from 'bcryptjs';
import { Phase, PrismaClient, Tier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Zero@2025!', 10);

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
    { key: 'primeiro_lancamento', name: 'Cadastrar primeiro lançamento', description: 'Registrar primeiro lançamento financeiro', phase: Phase.BOMBEIRO, coinReward: 10 },
    { key: 'primeira_saida', name: 'Cadastrar primeira saída', description: 'Registrar primeira saída', phase: Phase.BOMBEIRO, coinReward: 10 },
    { key: 'ver_dashboard', name: 'Acessar Dashboard', description: 'Visualizar dashboard completo', phase: Phase.BOMBEIRO, coinReward: 5 },
    { key: 'mapear_divida', name: 'Mapear primeira dívida', description: 'Cadastrar ao menos uma dívida', phase: Phase.SOBREVIVENTE, coinReward: 20 },
    { key: 'criar_meta', name: 'Criar primeira meta', description: 'Criar primeira meta de sonho', phase: Phase.SOBREVIVENTE, coinReward: 20 },
    { key: 'primeiro_mes_completo', name: 'Fechar 1 mês completo', description: 'Completar entradas e saídas do mês', phase: Phase.SOBREVIVENTE, coinReward: 100 },
    { key: 'quitar_divida', name: 'Quitar uma dívida', description: 'Marcar dívida como quitada', phase: Phase.CONSTRUTOR, coinReward: 200 },
    { key: 'sequencia_3_meses', name: '3 meses consecutivos ativos', description: 'Manter constância por 3 meses', phase: Phase.CONSTRUTOR, coinReward: 250 },
    { key: 'meta_reserva', name: 'Meta de reserva de emergência', description: 'Criar meta de reserva', phase: Phase.CONSTRUTOR, coinReward: 30 },
    { key: 'primeiro_investimento', name: 'Registrar primeiro investimento', description: 'Adicionar investimento inicial', phase: Phase.MULTIPLICADOR, coinReward: 50 },
    { key: 'meta_atingida_100', name: 'Atingir 100% de uma meta', description: 'Concluir meta em 100%', phase: Phase.MULTIPLICADOR, coinReward: 150 },
    { key: 'indicar_amigo', name: 'Indicar amigo cadastrado', description: 'Convidar amigo com cadastro confirmado', phase: Phase.MULTIPLICADOR, coinReward: 80 }
  ];

  for (const mission of missions) {
    await prisma.mission.upsert({ where: { key: mission.key }, update: mission, create: mission });
  }

  const codes = [
    { code: 'WORKSHOP2025A', tier: Tier.MOVIMENTO, coinBonus: 500 },
    { code: 'WORKSHOP2025B', tier: Tier.MOVIMENTO, coinBonus: 500 },
    { code: 'GRUPO2025A', tier: Tier.ACELERACAO, coinBonus: 300 }
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
