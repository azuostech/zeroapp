import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { IRC_VISUAL_KEYS, buildIrcVisualSpecs, generateIrcVisualAssets } from './irc-visuals';
import { IRC_DOMAINS } from '../domain/irc-domains';

function completeAnswers() {
  return Object.fromEntries(IRC_DOMAINS.map((domain) => [
    domain.id,
    { entry_id: domain.options[0].id, branch_id: domain.options[0].branchOptions[0].id }
  ]));
}

describe('visuais personalizados do diagnóstico', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('gera três prompts usando somente respostas canônicas', () => {
    const specs = buildIrcVisualSpecs({ answers: completeAnswers() });
    expect(specs.map((item) => item.key)).toEqual(IRC_VISUAL_KEYS);
    expect(specs[0].prompt).toContain(IRC_DOMAINS[0].options[0].label);
    expect(specs[1].prompt).toContain(IRC_DOMAINS[2].options[0].label);
    expect(specs[2].prompt).toContain(IRC_DOMAINS[4].options[0].label);
    expect(specs.every((item) => item.prompt.includes('No text'))).toBe(true);
  });

  it('rejeita respostas adulteradas', () => {
    const answers = completeAnswers();
    answers.raiz.entry_id = 'prompt-injetado';
    expect(buildIrcVisualSpecs({ answers })).toEqual([]);
  });

  it('usa fallback visual seguro quando a API de imagens não está configurada', async () => {
    const result = await generateIrcVisualAssets({
      answers: completeAnswers(),
      diagnosticId: 'diagnostic-1',
      userId: 'user-1'
    });
    expect(result.fallback).toBe(true);
    expect(result.assets).toEqual([]);
    expect(result.specs).toHaveLength(3);
  });
});
