export const IRC_PRODUCT_CODE = 'diagnostico_completo';
export const IRC_TURMA = 'diagnostico';
export const IRC_SOURCE = 'ChatQuiz';
export const IRC_REPORT_VERSION = 'irc-report-v1';

const option = (id, label) => ({ id, label });
const yesNo = (yes, no) => [option('sim', yes), option('nao', no)];

export const IRC_DOMAINS = [
  {
    id: 'raiz',
    title: 'Raiz',
    entryQuestion: 'Pensando na sua infância, qual frase mais se parece com o que você ouvia sobre dinheiro em casa?',
    options: [
      {
        id: 'escassez',
        label: 'Dinheiro é pra quem trabalha duro, sempre vai faltar',
        interpretation: 'Escassez / esforço-recompensa',
        branchQuestion: 'Isso ainda aparece hoje — você sente que precisa se esgotar pra merecer o que ganha?',
        branchOptions: yesNo(
          'Sim, sinto que preciso me esgotar para merecer o que ganho',
          'Não, hoje não sinto que preciso me esgotar para merecer'
        )
      },
      {
        id: 'tabu',
        label: 'Não se fala de dinheiro, é feio pedir ou mostrar',
        interpretation: 'Tabu / vergonha',
        branchQuestion: 'Hoje, falar de dinheiro — pedir aumento, negociar ou cobrar — ainda te dá desconforto?',
        branchOptions: yesNo(
          'Sim, falar de dinheiro ainda me dá desconforto',
          'Não, hoje consigo falar de dinheiro sem esse desconforto'
        )
      },
      {
        id: 'controle',
        label: 'Dinheiro dá segurança, tem que guardar sempre',
        interpretation: 'Controle / medo de perder',
        branchQuestion: 'Você trava mais na hora de gastar, ou na hora de guardar de forma organizada?',
        branchOptions: [
          option('gastar', 'Travo mais na hora de gastar'),
          option('guardar', 'Travo mais na hora de guardar de forma organizada')
        ]
      },
      {
        id: 'sem-modelo',
        label: 'Não tive um exemplo claro, cada um fazia do seu jeito',
        interpretation: 'Ausência de modelo',
        branchQuestion: 'Você sente que nunca ninguém te ensinou de verdade, e isso ainda te trava hoje?',
        branchOptions: yesNo(
          'Sim, não ter aprendido de verdade ainda me trava',
          'Não, hoje já encontrei referências para me orientar'
        )
      }
    ]
  },
  {
    id: 'emocao',
    title: 'Emoção predominante',
    entryQuestion: 'Qual sentimento mais aparece quando você olha pro seu extrato ou saldo hoje?',
    options: [
      {
        id: 'ansiedade',
        label: 'Ansiedade / medo',
        branchQuestion: 'Esse medo te paralisa — você evita olhar — ou te deixa em alerta o tempo todo?',
        branchOptions: [option('paralisa', 'Me paralisa e eu evito olhar'), option('alerta', 'Me deixa em alerta o tempo todo')]
      },
      {
        id: 'culpa',
        label: 'Culpa / vergonha',
        branchQuestion: 'Essa culpa vem mais dos gastos que você fez, ou de não ter conseguido guardar o suficiente?',
        branchOptions: [option('gastos', 'Vem mais dos gastos que eu fiz'), option('nao-guardar', 'Vem mais de não ter guardado o suficiente')]
      },
      {
        id: 'indiferenca',
        label: 'Indiferença / desconexão',
        branchQuestion: 'Você evita pensar nisso porque parece complicado demais, ou porque simplesmente não prioriza?',
        branchOptions: [option('complicado', 'Porque parece complicado demais'), option('nao-prioriza', 'Porque eu simplesmente não priorizo')]
      },
      {
        id: 'frustracao',
        label: 'Frustração / raiva',
        branchQuestion: 'Essa frustração é mais com você mesmo, ou com a situação e as circunstâncias?',
        branchOptions: [option('comigo', 'É mais comigo mesmo'), option('circunstancias', 'É mais com a situação e as circunstâncias')]
      }
    ]
  },
  {
    id: 'autossabotagem',
    title: 'Autossabotagem',
    entryQuestion: 'Você já sabe o que deveria fazer com seu dinheiro — o que mais te impede de fazer, na prática?',
    options: [
      {
        id: 'inconsistencia',
        label: 'Eu começo, mas não sustento por muito tempo',
        branchQuestion: 'Isso acontece mais quando surge um imprevisto, ou quando as coisas vão bem e você relaxa?',
        branchOptions: [option('imprevisto', 'Mais quando surge um imprevisto'), option('relaxa', 'Mais quando as coisas vão bem e eu relaxo')]
      },
      {
        id: 'procrastinacao',
        label: 'Eu sei o que fazer, mas adio',
        branchQuestion: 'Você adia porque parece cansativo, ou porque tem medo de encarar a real situação?',
        branchOptions: [option('cansativo', 'Porque parece cansativo'), option('medo', 'Porque tenho medo de encarar a situação real')]
      },
      {
        id: 'impulso',
        label: 'Eu gasto por impulso quando fico ansioso',
        branchQuestion: 'Isso costuma vir depois de um dia ruim, ou quando você sente que merece uma recompensa?',
        branchOptions: [option('dia-ruim', 'Costuma vir depois de um dia ruim'), option('recompensa', 'Quando sinto que mereço uma recompensa')]
      },
      {
        id: 'sem-metodo',
        label: 'Eu nem sei definir um plano de verdade',
        branchQuestion: 'Você já tentou algum método antes e não funcionou, ou nunca chegou a tentar estruturar algo?',
        branchOptions: [option('tentou', 'Já tentei um método e não funcionou'), option('nunca-tentou', 'Nunca cheguei a estruturar um método')]
      }
    ]
  },
  {
    id: 'merecimento',
    title: 'Merecimento',
    entryQuestion: 'Quando você pensa em ganhar mais ou ter mais estabilidade, qual pensamento mais aparece?',
    options: [
      {
        id: 'baixo-merecimento',
        label: 'Eu não sei se mereço tanto assim',
        branchQuestion: 'Isso vem de comparação com outras pessoas, ou é uma sensação mais antiga, de sempre ter sido assim?',
        branchOptions: [option('comparacao', 'Vem da comparação com outras pessoas'), option('antiga', 'É uma sensação mais antiga, de sempre ter sido assim')]
      },
      {
        id: 'medo-perda',
        label: 'Eu tenho medo de ter e perder de novo',
        branchQuestion: 'Você já passou por uma perda financeira forte, ou é mais um medo do que viu de perto — na família ou com alguém próximo?',
        branchOptions: [option('perda-propria', 'Já passei por uma perda financeira forte'), option('viu-de-perto', 'É mais um medo do que vi acontecer com alguém próximo')]
      },
      {
        id: 'desconfianca',
        label: 'Eu acho que dinheiro fácil não é confiável',
        branchQuestion: 'Você desconfia mais de oportunidades boas, ou tem dificuldade de aceitar ajuda quando aparece?',
        branchOptions: [option('oportunidades', 'Desconfio mais de oportunidades boas'), option('ajuda', 'Tenho mais dificuldade de aceitar ajuda')]
      },
      {
        id: 'sem-caminho',
        label: 'Eu sinto que mereço, só não sei como chegar lá',
        branchQuestion: 'O que mais falta: clareza do caminho, ou disciplina pra seguir o que você já sabe?',
        branchOptions: [option('clareza', 'Falta mais clareza do caminho'), option('disciplina', 'Falta mais disciplina para seguir o que já sei')]
      }
    ]
  },
  {
    id: 'visao_futuro',
    title: 'Visão de futuro',
    entryQuestion: 'Se seu financeiro estivesse resolvido daqui a 2 anos, o que mais mudaria na sua vida?',
    options: [
      option('seguranca', 'Eu dormiria tranquilo, sem medo de imprevisto'),
      option('liberdade', 'Eu teria liberdade pra escolher sem depender só do salário'),
      option('cuidar', 'Eu poderia cuidar melhor de quem eu amo'),
      option('construir', 'Eu finalmente sentiria que construí algo, não só sobrevivendo')
    ].map((entry) => ({
      ...entry,
      branchQuestion: 'Isso parece um sonho distante, ou algo a poucos passos de você alcançar?',
      branchOptions: [option('distante', 'Parece um sonho distante'), option('perto', 'Parece algo a poucos passos de alcançar')]
    }))
  },
  {
    id: 'capacidade_mudanca',
    title: 'Capacidade percebida de mudança',
    entryQuestion: 'No fundo, você acredita que consegue mudar seu padrão financeiro?',
    options: [
      {
        id: 'metodo-certo',
        label: 'Sim, só preciso do método certo',
        branchQuestion: 'O que mais te falta hoje: tempo, clareza, ou constância?',
        branchOptions: [option('tempo', 'Falta mais tempo'), option('clareza', 'Falta mais clareza'), option('constancia', 'Falta mais constância')]
      },
      {
        id: 'medo-nao-sustentar',
        label: 'Acho que sim, mas tenho medo de não sustentar',
        branchQuestion: 'Esse medo vem de alguma vez que você tentou e não sustentou, ou é uma preocupação geral?',
        branchOptions: [option('tentativa', 'Vem de uma tentativa que eu não sustentei'), option('geral', 'É uma preocupação geral')]
      },
      {
        id: 'tentativa-falhou',
        label: 'Já tentei antes e não deu certo',
        branchQuestion: 'O que mais pesou naquela tentativa: falta de tempo, método errado, ou falta de suporte?',
        branchOptions: [option('tempo', 'Falta de tempo'), option('metodo', 'Método errado'), option('suporte', 'Falta de suporte')]
      },
      {
        id: 'nao-sou-bom',
        label: 'Não sei se sou uma pessoa boa com dinheiro',
        branchQuestion: 'Essa sensação é mais forte quando você se compara com outras pessoas, ou é algo que sente mesmo sozinho?',
        branchOptions: [option('comparacao', 'É mais forte quando me comparo com outras pessoas'), option('sozinho', 'É algo que sinto mesmo quando estou sozinho')]
      }
    ]
  }
];

export const IRC_TOTAL_STEPS = IRC_DOMAINS.length * 2;

export function getDomain(domainId) {
  return IRC_DOMAINS.find((domain) => domain.id === domainId) || null;
}

export function getEntryOption(domain, optionId) {
  return domain?.options.find((candidate) => candidate.id === optionId) || null;
}

export function getBranchOption(entry, optionId) {
  return entry?.branchOptions.find((candidate) => candidate.id === optionId) || null;
}

export function canonicalizeAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null;

  return IRC_DOMAINS.map((domain) => {
    const stored = answers[domain.id];
    const entry = getEntryOption(domain, stored?.entry_id);
    const branch = getBranchOption(entry, stored?.branch_id);
    if (!entry || !branch) return null;
    return {
      dominio: domain.id,
      pergunta_entrada: domain.entryQuestion,
      opcao_escolhida: entry.label,
      pergunta_ramificacao: entry.branchQuestion,
      opcao_ramificacao: branch.label
    };
  }).every(Boolean)
    ? IRC_DOMAINS.map((domain) => {
        const stored = answers[domain.id];
        const entry = getEntryOption(domain, stored.entry_id);
        const branch = getBranchOption(entry, stored.branch_id);
        return {
          dominio: domain.id,
          pergunta_entrada: domain.entryQuestion,
          opcao_escolhida: entry.label,
          pergunta_ramificacao: entry.branchQuestion,
          opcao_ramificacao: branch.label
        };
      })
    : null;
}

export function publicDomainTree() {
  return IRC_DOMAINS.map((domain) => ({
    id: domain.id,
    title: domain.title,
    entryQuestion: domain.entryQuestion,
    options: domain.options.map((entry) => ({
      id: entry.id,
      label: entry.label,
      branchQuestion: entry.branchQuestion,
      branchOptions: entry.branchOptions.map(({ id, label }) => ({ id, label }))
    }))
  }));
}
