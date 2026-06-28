export function baseTemplate({ preheader, content, footerText = 'Voce recebe este email por ser mentorado ativo do programa Financas do Zero.' }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZeroApp</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #f5f5f5; }
  .preheader { display: none; max-height: 0; overflow: hidden; }
  .wrapper { max-width: 580px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: #00C853; padding: 32px 36px 24px; text-align: center; }
  .logo { font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -1px; }
  .tagline { font-size: 12px; color: #eafff0; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
  .body { padding: 32px 36px; }
  .greeting { font-size: 22px; font-weight: 700; color: #1A1A1A; margin-bottom: 12px; }
  .intro { font-size: 15px; color: #555; line-height: 1.8; margin-bottom: 28px; }
  .highlight { background: #E8F5E9; border: 1px solid #C8E6C9; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
  .hl-label { font-size: 11px; color: #1B5E20; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .hl-value { font-size: 28px; font-weight: 800; color: #1B5E20; font-family: 'Courier New', monospace; }
  .hl-sub { font-size: 12px; color: #555; margin-top: 4px; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .stat { background: #f8f8f8; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-n { font-size: 24px; font-weight: 800; font-family: 'Courier New', monospace; }
  .stat-l { font-size: 11px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat.green .stat-n { color: #00C853; }
  .stat.gold .stat-n  { color: #B8860B; }
  .stat.rose .stat-n  { color: #e05060; }
  .stat.purple .stat-n{ color: #7c3aed; }
  .divider { height: 1px; background: #eee; margin: 24px 0; }
  .section-title { font-size: 16px; font-weight: 800; color: #1A1A1A; margin-bottom: 12px; }
  .quote-box { border-left: 3px solid; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-bottom: 10px; font-size: 14px; line-height: 1.7; }
  .quote-green  { border-color: #00C853; background: #f0faf5; color: #555555; }
  .quote-rose   { border-color: #FB7185; background: #fff5f7; color: #555555; }
  .quote-purple { border-color: #A78BFA; background: #f5f3ff; color: #7c3aed; font-weight: 700; font-size: 15px; }
  .cta-box { background: #E8F5E9; border: 1px solid #C8E6C9; border-radius: 12px; padding: 20px 24px; text-align: center; margin: 24px 0; }
  .cta-text { font-size: 14px; color: #555; margin-bottom: 14px; line-height: 1.6; }
  .cta-btn { display: inline-block; background: #00C853; color: #ffffff; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 10px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; }
  .assinatura { font-size: 14px; color: #555; line-height: 1.9; margin-top: 20px; }
  .assinatura strong { color: #1A1A1A; }
  .footer { background: #f5f5f5; padding: 18px 36px; font-size: 11px; color: #aaa; text-align: center; line-height: 1.8; }
  .footer a { color: #00C853; text-decoration: none; }
</style>
</head>
<body>
<span class="preheader">${preheader}</span>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="logo">ZERO</div>
      <div class="tagline">Financas do Zero · by Jackson Souza</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      ${footerText}<br>
      <a href="${siteUrl}">Abrir ZeroApp</a>
      &nbsp;·&nbsp;
      <a href="${siteUrl}/perfil">Gerenciar preferencias</a>
    </div>
  </div>
</div>
</body>
</html>`;
}
