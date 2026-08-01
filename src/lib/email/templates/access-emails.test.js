import { afterEach, describe, expect, it } from 'vitest';
import { ircAccessEmail } from './irc-access';
import { ircReportReadyEmail } from './irc-report-ready';
import { zeroAppAccessEmail } from './zeroapp-access';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe('e-mails de acesso pós-compra', () => {
  it('envia novo cliente do ZeroApp para definir a senha e informa o e-mail de acesso', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://zeroapp.tech';
    const template = zeroAppAccessEmail({
      name: 'Ana Souza',
      email: 'ana@example.com',
      passwordSetupUrl: 'https://auth.example.com/setup'
    });

    expect(template.subject).toContain('dados de acesso ao ZeroApp');
    expect(template.html).toContain('ana@example.com');
    expect(template.html).toContain('https://auth.example.com/setup');
    expect(template.html).toContain('DEFINIR MINHA SENHA');
  });

  it('envia cliente existente do ZeroApp para o login', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://zeroapp.tech';
    const template = zeroAppAccessEmail({ name: 'Ana', email: 'ana@example.com' });

    expect(template.html).toContain('https://zeroapp.tech/');
    expect(template.html).toContain('ENTRAR NO ZEROAPP');
    expect(template.html).not.toContain('DEFINIR MINHA SENHA');
  });

  it('prioriza obrigadoquiz no produto Diagnóstico e preserva o link de senha', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://zeroapp.tech';
    const template = ircAccessEmail({
      name: 'Ana',
      inviteUrl: 'https://auth.example.com/setup',
      isNewUser: true
    });

    expect(template.html).toContain('https://zeroapp.tech/obrigadoquiz');
    expect(template.html).toContain('VER MEUS PRÓXIMOS PASSOS');
    expect(template.html).toContain('https://auth.example.com/setup');
    expect(template.html.indexOf('/obrigadoquiz')).toBeLessThan(template.html.indexOf('https://auth.example.com/setup'));
  });

  it('leva do relatório para a aula da Planilha Financeira dentro do ZeroApp', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://zeroapp.tech';
    const template = ircReportReadyEmail({ name: 'Ana' });

    expect(template.html).toContain('VISUALIZAR NO ZEROAPP');
    expect(template.html).toContain('ASSISTIR À AULA DA PLANILHA');
    expect(template.html).toContain('/conteudo/30dcaf91-2aca-4e2f-a68c-1d2ebf68a189/b60cb1e3-9e76-42e8-910d-c209f46a246a');
  });
});
