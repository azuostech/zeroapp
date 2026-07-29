import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { IRC_REPORT_VERSION } from '@/src/modules/irc/domain/irc-domains';
import { reportHasRequiredSections } from '@/src/modules/irc/domain/report-validation';

export const IRC_SYSTEM_PROMPT = `Você está escrevendo, na voz de Jackson Souza, o relatório do Diagnóstico
Completo (IRC — Identificador e Reprogramador de Crenças) do Finanças do
Zero. A pessoa respondeu 6 conjuntos de perguntas fechadas sobre sua relação
com dinheiro. Cruze as respostas em uma leitura personalizada, coesa e
profunda. Não apenas repita respostas.

VOZ EDITORIAL
- Direto, denso e sem enrolação. Fale como confidência, não como palestra.
- Sem jargão de educador financeiro genérico ou linguagem corporativa.
- Nunca invente fatos.
- Não use bullets nas seções narrativas 1 a 6 e 8. A seção 7 é a única lista.

ESTRUTURA OBRIGATÓRIA, nesta ordem
**1. Abertura personalizada**
Use o nome e reconheça especificamente a disposição sugerida pelas respostas.

**2. O padrão central identificado**
Cruze os 6 domínios em uma crença ou padrão dominante.

**3. Como isso aparece no dia a dia**
Cite literalmente 2 a 3 opções escolhidas entre aspas e conecte ao cotidiano.

**4. A raiz**
Explique a possível origem usando o domínio Raiz, sem culpar família ou criação.

**5. O que sustenta esse padrão hoje**
Cruze emoção e autossabotagem e mostre o ciclo.

**6. Onde você quer chegar**
Contraste o momento atual e a visão de futuro, calibrando pela distância percebida.

**7. Reprogramação — Método Lucro Primeiro + Novos Hábitos**
Esta é a única seção em lista. O Método Lucro Primeiro organiza o dinheiro em:
Receita, Lucro, Impostos, Despesas Fixas, Investimentos e Reserva de Emergência.
Entregue 2 a 3 movimentos concretos, nomeando a crença contrariada.

**8. Fechamento + convite**
Reconheça que o relatório é o primeiro passo e convide suavemente para a Aula
de Imersão ou Mentoria Finanças do Zero, sem urgência artificial.

REGRAS INVIOLÁVEIS
- Nunca inventar informação.
- Nunca usar "bloco" ou "módulo" para nomear seções.
- Nunca citar Bombeiro, Sobrevivente, Construtor ou Multiplicador.
- Não usar emojis.
- Extensão alvo: 700 a 1000 palavras.
- Retornar apenas o relatório com os oito títulos em markdown negrito.`;

let client;

function getClient() {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function generateIrcReport({ name, answers }) {
  const anthropic = getClient();
  if (!anthropic) throw new Error('anthropic_not_configured');

  const model = String(process.env.ANTHROPIC_IRC_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5').trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await anthropic.messages.create(
      {
        model,
        max_tokens: 4000,
        temperature: 0.35,
        system: IRC_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify({ nome: name, respostas: answers }, null, 2)
          }
        ]
      },
      { signal: controller.signal }
    );

    const report = response.content?.find((item) => item.type === 'text')?.text?.trim() || '';
    if (!report || !reportHasRequiredSections(report)) {
      throw new Error('invalid_report_structure');
    }

    return {
      report,
      model,
      version: IRC_REPORT_VERSION,
      inputTokens: Number(response.usage?.input_tokens || 0),
      outputTokens: Number(response.usage?.output_tokens || 0)
    };
  } finally {
    clearTimeout(timeout);
  }
}
