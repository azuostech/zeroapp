// lib/mavf-config.js
// Configuração dos 11 pilares do MAVF

export const MAVF_PILLARS = [
  {
    id: 'financeiro',
    label: 'Financeiro',
    emoji: '💰',
    angle: 0,
    questions: [
      'Como você avalia sua saúde financeira atual?',
      'Você tem controle sobre suas receitas e despesas?',
      'Está satisfeito com suas reservas de emergência?'
    ]
  },
  {
    id: 'profissional',
    label: 'Profissional',
    emoji: '💼',
    angle: 32.7,
    questions: [
      'Você está satisfeito com sua carreira atual?',
      'Sente que está crescendo profissionalmente?',
      'Seu trabalho está alinhado com seus valores?'
    ]
  },
  {
    id: 'emocional',
    label: 'Emocional',
    emoji: '❤️',
    angle: 65.4,
    questions: [
      'Como você avalia sua saúde emocional?',
      'Consegue lidar bem com o estresse?',
      'Sente-se equilibrado emocionalmente?'
    ]
  },
  {
    id: 'espiritual',
    label: 'Espiritual',
    emoji: '🙏',
    angle: 98.1,
    questions: [
      'Você se sente conectado com seu propósito?',
      'Pratica sua espiritualidade regularmente?',
      'Sente paz interior no dia a dia?'
    ]
  },
  {
    id: 'parentes',
    label: 'Parentes',
    emoji: '👨‍👩‍👧',
    angle: 130.8,
    questions: [
      'Como está o relacionamento com sua família?',
      'Você passa tempo de qualidade com seus pais/irmãos?',
      'Sente apoio familiar quando precisa?'
    ]
  },
  {
    id: 'conjugal',
    label: 'Conjugal',
    emoji: '💑',
    angle: 163.5,
    questions: [
      'Como está seu relacionamento conjugal?',
      'Há comunicação saudável com seu parceiro(a)?',
      'Você investe tempo na relação?'
    ]
  },
  {
    id: 'filhos',
    label: 'Filhos',
    emoji: '👶',
    angle: 196.2,
    questions: [
      'Como está sua relação com seus filhos?',
      'Você dedica tempo de qualidade a eles?',
      'Sente que está sendo um bom pai/mãe?'
    ]
  },
  {
    id: 'social',
    label: 'Social',
    emoji: '🤝',
    angle: 228.9,
    questions: [
      'Você tem amizades verdadeiras?',
      'Cultiva relações sociais saudáveis?',
      'Sente-se parte de uma comunidade?'
    ]
  },
  {
    id: 'saude',
    label: 'Saúde',
    emoji: '🏃',
    angle: 261.6,
    questions: [
      'Como você avalia sua saúde física?',
      'Pratica exercícios regularmente?',
      'Está cuidando bem do seu corpo?'
    ]
  },
  {
    id: 'servir',
    label: 'Servir',
    emoji: '🤲',
    angle: 294.3,
    questions: [
      'Você contribui com causas sociais?',
      'Ajuda pessoas ao seu redor?',
      'Sente que está fazendo diferença no mundo?'
    ]
  },
  {
    id: 'intelectual',
    label: 'Intelectual',
    emoji: '📚',
    angle: 327,
    questions: [
      'Você investe em aprendizado contínuo?',
      'Está expandindo seus conhecimentos?',
      'Sente-se intelectualmente estimulado?'
    ]
  }
];

export const MAVF_ALLOWED_TIERS = ['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];
export const MAVF_PILLAR_IDS = MAVF_PILLARS.map((pillar) => pillar.id);
export const MAVF_PILLARS_MAP = MAVF_PILLARS.reduce((acc, pillar) => {
  acc[pillar.id] = pillar;
  return acc;
}, {});

export const PILLAR_COLORS = {
  financeiro: '#00C853',
  profissional: '#2196F3',
  emocional: '#E91E63',
  espiritual: '#9C27B0',
  parentes: '#FF9800',
  conjugal: '#F44336',
  filhos: '#FFEB3B',
  social: '#4CAF50',
  saude: '#00BCD4',
  servir: '#795548',
  intelectual: '#607D8B'
};
