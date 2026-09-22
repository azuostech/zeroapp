import PDFDocument from 'pdfkit';
import { canonicalizeAnswers, IRC_DOMAINS } from '../domain/irc-domains';
import { IRC_NEXT_STEPS_TEXT, IRC_NEXT_STEPS_TITLE, IRC_ZEROAPP_LESSON_PATH } from '../domain/irc-next-steps';

const PAGE = { width: 595.28, height: 841.89, margin: 48, bottom: 790 };
const C = { ink: '#17231C', body: '#33453A', muted: '#6F7E75', green: '#087D3D', emerald: '#10C968', pale: '#E8F8EF', sage: '#CBE7D4', cream: '#F7F4EA', yellow: '#F5C94A', line: '#D8E5DC', white: '#FFFFFF', charcoal: '#132E23' };
const METHOD_CATEGORIES = [['RECEITA', 'Tudo o que entra'], ['LUCRO', 'Você vem primeiro'], ['IMPOSTOS', 'Obrigações previstas'], ['DESPESAS FIXAS', 'A base do mês'], ['INVESTIMENTOS', 'Construção de futuro'], ['RESERVA', 'Proteção para imprevistos']];

function brandText(value) {
  return String(value || '').replace(/Método Lucro Primeiro/gi, 'Método Finanças do Zero').replace(/MÉTODO LUCRO PRIMEIRO/g, 'MÉTODO FINANÇAS DO ZERO').replace(/\*\*/g, '').trim();
}

export function parseIrcReport(report) {
  const sections = [];
  let current = null;
  for (const rawLine of String(report || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*$/);
    if (heading) {
      current = { number: Number(heading[1]), heading: brandText(heading[2]), paragraphs: [], items: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const item = brandText(line.replace(/^([-*]|\d+[.)])\s+/, ''));
      const matchedTitle = item.match(/^([^.!?]+[.!?])\s*(.*)$/);
      current.items.push({ title: matchedTitle?.[1] || '', text: matchedTitle?.[2] || item });
    } else {
      current.paragraphs.push(brandText(line));
    }
  }
  return sections;
}

function sectionByNumber(sections, number) {
  return sections.find((section) => section.number === number) || { number, heading: `Seção ${number}`, paragraphs: [], items: [] };
}

function addPage(doc, state, { background = C.cream, label = '', cover = false } = {}) {
  doc.addPage({ size: 'A4', margin: 0 });
  state.page += 1;
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(background);
  if (cover) return;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green).text(`DIAGNÓSTICO PERSONALIZADO  /  ${String(state.page).padStart(2, '0')}`, PAGE.margin, 31, { width: 300, characterSpacing: 1.2 });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text(String(label).toUpperCase(), PAGE.width - PAGE.margin - 210, 31, { width: 210, align: 'right', characterSpacing: 1 });
  doc.moveTo(PAGE.margin, 51).lineTo(PAGE.width - PAGE.margin, 51).lineWidth(0.7).stroke(C.line);
  doc.moveTo(PAGE.margin, PAGE.height - 37).lineTo(PAGE.width - PAGE.margin, PAGE.height - 37).lineWidth(0.6).stroke(C.line);
  doc.font('Helvetica').fontSize(7.2).fillColor(C.muted).text(`${state.displayName.toUpperCase()}  •  ZEROAPP`, PAGE.margin, PAGE.height - 27, { width: 320 });
  doc.font('Helvetica-Bold').text(String(state.page).padStart(2, '0'), PAGE.width - PAGE.margin - 20, PAGE.height - 27, { width: 20, align: 'right', lineBreak: false });
}

function kicker(doc, text, x, y, color = C.green) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(color).text(String(text).toUpperCase(), x, y, { characterSpacing: 1.25 });
}

function title(doc, text, x, y, width, size = 28, color = C.ink) {
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(brandText(text), x, y, { width, lineGap: 1 });
  return doc.y;
}

function roundedCard(doc, x, y, width, height, fill = C.white, radius = 14, stroke = null) {
  doc.roundedRect(x, y, width, height, radius).fill(fill);
  if (stroke) doc.roundedRect(x, y, width, height, radius).lineWidth(0.8).stroke(stroke);
}

function cropImage(doc, image, x, y, width, height, radius = 0) {
  if (!image) return false;
  try {
    doc.save();
    if (radius) doc.roundedRect(x, y, width, height, radius).clip();
    else doc.rect(x, y, width, height).clip();
    doc.image(image, x, y, { cover: [width, height], align: 'center', valign: 'center' });
    doc.restore();
    return true;
  } catch (_) {
    try { doc.restore(); } catch (_) {}
    return false;
  }
}

function splitToFit(doc, text, width, height, size = 11.2, lineGap = 4.2) {
  const words = brandText(text).split(/\s+/).filter(Boolean);
  if (!words.length) return ['', ''];
  doc.font('Helvetica').fontSize(size);
  let low = 1;
  let high = words.length;
  let best = 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const measured = doc.heightOfString(words.slice(0, middle).join(' '), { width, lineGap });
    if (measured <= height) { best = middle; low = middle + 1; } else high = middle - 1;
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function writeNarrative(doc, state, text, { x, y, width, height, label, sectionNumber, heading }) {
  let remaining = brandText(text);
  while (remaining) {
    const [chunk, rest] = splitToFit(doc, remaining, width, height);
    doc.font('Helvetica').fontSize(11.2).fillColor(C.body).text(chunk, x, y, { width, lineGap: 4.3 });
    remaining = rest;
    if (!remaining) break;
    addPage(doc, state, { background: C.white, label: `${label} - continuação` });
    kicker(doc, `${sectionNumber}. ${heading} - continuação`, PAGE.margin, 76);
    x = PAGE.margin; y = 115; width = PAGE.width - PAGE.margin * 2; height = 620;
  }
}

function drawAbstractCover(doc, answers) {
  const seeds = answers?.length ? answers : [{}, {}, {}];
  doc.save().fillOpacity(0.28);
  seeds.slice(0, 6).forEach((_, index) => doc.circle(40 + ((index * 97) % 510), 70 + index * 125, 95 + (index % 3) * 28).fill(index % 2 ? C.emerald : C.yellow));
  doc.restore();
  doc.lineWidth(26).lineCap('round').strokeColor('#E9D88C').moveTo(70, 700).bezierCurveTo(180, 600, 180, 490, 310, 420).bezierCurveTo(420, 350, 390, 230, 535, 135).stroke();
}

function drawCover(doc, state, visual, answers, generatedAt) {
  addPage(doc, state, { background: C.charcoal, cover: true });
  const hasImage = cropImage(doc, visual, 0, 0, PAGE.width, PAGE.height);
  if (!hasImage) drawAbstractCover(doc, answers);
  doc.save().fillOpacity(hasImage ? 0.58 : 0.32).rect(0, 0, PAGE.width, PAGE.height).fill(C.charcoal).restore();
  kicker(doc, 'FINANÇAS DO ZERO  /  ZEROAPP', PAGE.margin, 76, '#CFF8DE');
  title(doc, 'Diagnóstico\nFinanceiro\nCompleto', PAGE.margin, 112, 460, 40, C.white);
  doc.font('Helvetica').fontSize(12.3).fillColor('#ECF5EF').text('Ferramenta de Diagnóstico, Identificador e Reprogramador de Crenças desenvolvida por Jackson Souza', PAGE.margin, 300, { width: 455, lineGap: 4 });
  roundedCard(doc, PAGE.margin, 605, PAGE.width - PAGE.margin * 2, 157, '#10251B', 18);
  kicker(doc, 'RELATÓRIO INDIVIDUAL', PAGE.margin + 24, 631, C.yellow);
  doc.font('Helvetica-Bold').fontSize(24).fillColor(C.white).text(state.displayName, PAGE.margin + 24, 657, { width: PAGE.width - PAGE.margin * 2 - 48 });
  doc.font('Helvetica').fontSize(9.6).fillColor('#D7E8DC').text('Uma leitura integrada das crenças, emoções e comportamentos que influenciam sua relação com o dinheiro.', PAGE.margin + 24, 700, { width: PAGE.width - PAGE.margin * 2 - 48, lineGap: 3 });
  const date = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(generatedAt || Date.now()));
  doc.font('Helvetica-Bold').fontSize(7.8).fillColor('#B8CCBE').text(`RELATÓRIO PERSONALIZADO  •  ${date.toUpperCase()}`, PAGE.margin + 24, 744, { characterSpacing: 1 });
}

function drawMap(doc, state, answers) {
  addPage(doc, state, { label: 'Mapa individual' });
  kicker(doc, 'SUA LEITURA EM SEIS DIMENSÕES', PAGE.margin, 75);
  title(doc, 'Um mapa construído a partir\ndas suas respostas', PAGE.margin, 97, PAGE.width - PAGE.margin * 2, 27);
  const byDomain = new Map((answers || []).map((item) => [item.dominio, item]));
  const gap = 12;
  const cardW = (PAGE.width - PAGE.margin * 2 - gap) / 2;
  IRC_DOMAINS.forEach((domain, index) => {
    const answer = byDomain.get(domain.id);
    const x = PAGE.margin + (index % 2) * (cardW + gap);
    const y = 194 + Math.floor(index / 2) * 174;
    const dark = domain.id === 'emocao';
    roundedCard(doc, x, y, cardW, 158, dark ? C.charcoal : C.white, 13, dark ? null : C.line);
    doc.circle(x + 28, y + 28, 15).fill(dark ? C.yellow : C.green);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(dark ? C.ink : C.white).text(String(index + 1), x + 18, y + 22, { width: 20, align: 'center' });
    kicker(doc, domain.title, x + 51, y + 21, dark ? '#CFF8DE' : C.green);
    doc.font('Helvetica-Bold').fontSize(11.2).fillColor(dark ? C.white : C.ink).text(answer?.opcao_escolhida || 'Resposta registrada', x + 18, y + 56, { width: cardW - 36, lineGap: 2 });
    doc.font('Helvetica').fontSize(8.8).fillColor(dark ? '#CDE0D3' : C.muted).text(answer?.opcao_ramificacao || '', x + 18, y + 105, { width: cardW - 36, lineGap: 2.2 });
  });
}

function drawCycle(doc, labels, centerX = PAGE.width / 2, centerY = 245) {
  const safe = labels.length === 4 ? labels : ['EMOÇÃO', 'EVITA OLHAR', 'SEM PLANO', 'MENOS CLAREZA'];
  const nodes = [[centerX, centerY - 78], [centerX + 142, centerY], [centerX, centerY + 78], [centerX - 142, centerY]];
  doc.circle(centerX, centerY, 57).fill(C.charcoal);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white).text('PADRÃO\nREPETIDO', centerX - 43, centerY - 15, { width: 86, align: 'center' });
  nodes.forEach(([x, y], index) => {
    doc.circle(x, y, 39).fillAndStroke(index === 3 ? C.yellow : C.white, C.line);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.ink).text(safe[index].toUpperCase(), x - 34, y - 9, { width: 68, align: 'center' });
  });
  [[42, -53, 104, -20], [104, 20, 42, 53], [-42, 53, -104, 20], [-104, -20, -42, -53]].forEach(([x1, y1, x2, y2]) => doc.moveTo(centerX + x1, centerY + y1).lineTo(centerX + x2, centerY + y2).lineWidth(1.8).stroke(C.green));
}

function drawSectionVisual(doc, number, answers, visual) {
  const map = new Map((answers || []).map((item) => [item.dominio, item]));
  const y = 150;
  if ((number === 3 || number === 6) && cropImage(doc, visual, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 205, 16)) return;
  if (number === 1) {
    roundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 205, C.pale, 17);
    doc.rect(PAGE.margin, y, 8, 205).fill(C.emerald);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.ink).text('Você já reconheceu que a mudança depende de você.', PAGE.margin + 30, y + 49, { width: PAGE.width - PAGE.margin * 2 - 60, lineGap: 5 });
    doc.font('Helvetica').fontSize(10.5).fillColor(C.body).text('O diagnóstico transforma disposição em direção visível.', PAGE.margin + 30, y + 137, { width: PAGE.width - PAGE.margin * 2 - 60 });
  } else if (number === 2) {
    [map.get('raiz')?.opcao_escolhida, map.get('emocao')?.opcao_escolhida, map.get('autossabotagem')?.opcao_escolhida].filter(Boolean).forEach((text, index) => {
      const x = PAGE.margin + index * 169;
      roundedCard(doc, x, y + 40, 155, 116, index === 1 ? C.charcoal : C.white, 13, index === 1 ? null : C.line);
      doc.font('Helvetica-Bold').fontSize(9.4).fillColor(index === 1 ? C.white : C.ink).text(text, x + 14, y + 75, { width: 127, align: 'center', lineGap: 2 });
      if (index < 2) doc.font('Helvetica-Bold').fontSize(14).fillColor(C.green).text('>', x + 155, y + 87, { width: 14, align: 'center' });
    });
  } else if (number === 3 || number === 5) {
    drawCycle(doc, [map.get('emocao')?.opcao_escolhida || 'Emoção', number === 3 ? map.get('emocao')?.opcao_ramificacao || 'Evitação' : 'Evita olhar', map.get('autossabotagem')?.opcao_escolhida || 'Sem plano', 'Menos clareza'], PAGE.width / 2, y + 101);
  } else if (number === 4) {
    const steps = [map.get('raiz')?.opcao_escolhida || 'Crença aprendida', 'Dinheiro como problema', 'Ausência de modelo', 'Padrão atual'];
    doc.moveTo(86, y + 83).lineTo(PAGE.width - 86, y + 83).lineWidth(5).stroke(C.sage);
    steps.forEach((text, index) => {
      const x = 86 + index * ((PAGE.width - 172) / 3);
      doc.circle(x, y + 83, 20).fill(index === 3 ? C.yellow : C.green);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(index === 3 ? C.ink : C.white).text(String(index + 1), x - 10, y + 77, { width: 20, align: 'center' });
      doc.font('Helvetica').fontSize(7.8).fillColor(C.body).text(text, x - 50, y + 116, { width: 100, align: 'center', lineGap: 2 });
    });
  } else if (number === 6) {
    roundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 205, C.pale, 17);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.green).text(map.get('visao_futuro')?.opcao_escolhida || 'Uma visão de futuro mais clara', PAGE.margin + 28, y + 45, { width: PAGE.width - PAGE.margin * 2 - 56, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text('DESEJO  →  MÉTODO  →  CLAREZA  →  AÇÃO', PAGE.margin + 28, y + 136, { width: PAGE.width - PAGE.margin * 2 - 56, align: 'center' });
  }
}

function drawNarrativeSection(doc, state, section, answers, visual) {
  addPage(doc, state, { background: section.number % 2 ? C.white : C.cream, label: section.heading });
  kicker(doc, `${section.number}. ${section.heading}`, PAGE.margin, 75);
  title(doc, section.heading, PAGE.margin, 96, PAGE.width - PAGE.margin * 2, 25);
  drawSectionVisual(doc, section.number, answers, visual);
  roundedCard(doc, PAGE.margin, 380, PAGE.width - PAGE.margin * 2, 365, C.white, 16, C.line);
  writeNarrative(doc, state, section.paragraphs.join('\n\n'), { x: PAGE.margin + 25, y: 407, width: PAGE.width - PAGE.margin * 2 - 50, height: 306, label: section.heading, sectionNumber: section.number, heading: section.heading });
}

function drawMethodOverview(doc, state) {
  addPage(doc, state, { label: 'Método Finanças do Zero' });
  kicker(doc, '7. REPROGRAMAÇÃO + NOVOS HÁBITOS', PAGE.margin, 88);
  title(doc, 'Método Finanças do Zero', PAGE.margin, 112, PAGE.width - PAGE.margin * 2, 29);
  doc.font('Helvetica').fontSize(10.8).fillColor(C.body).text('Uma estrutura visual para transformar movimentação em decisão, clareza e construção de futuro.', PAGE.margin, 158, { width: PAGE.width - PAGE.margin * 2 });
  const centerX = PAGE.width / 2;
  const centerY = 450;
  doc.circle(centerX, centerY, 68).fill(C.charcoal);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(C.white).text('MÉTODO\nFINANÇAS\nDO ZERO', centerX - 48, centerY - 25, { width: 96, align: 'center', lineGap: 2 });
  METHOD_CATEGORIES.forEach((item, index) => {
    const angle = (-90 + index * 60) * Math.PI / 180;
    const x = centerX + Math.cos(angle) * 168;
    const y = centerY + Math.sin(angle) * 168;
    doc.moveTo(centerX + Math.cos(angle) * 76, centerY + Math.sin(angle) * 76).lineTo(x - Math.cos(angle) * 54, y - Math.sin(angle) * 54).lineWidth(1.5).stroke(C.sage);
    roundedCard(doc, x - 65, y - 37, 130, 74, index === 1 ? '#FFF0B5' : C.white, 12, C.line);
    doc.font('Helvetica-Bold').fontSize(8.4).fillColor(C.green).text(item[0], x - 55, y - 20, { width: 110, align: 'center' });
    doc.font('Helvetica').fontSize(8.3).fillColor(C.body).text(item[1], x - 55, y + 3, { width: 110, align: 'center' });
  });
  roundedCard(doc, PAGE.margin, 705, PAGE.width - PAGE.margin * 2, 53, C.charcoal, 12);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.white).text('Olhar deixa de ser ameaça quando cada valor ganha um nome e uma função.', PAGE.margin + 20, 725, { width: PAGE.width - PAGE.margin * 2 - 40, align: 'center' });
}

export function parseActionContent(section) {
  const fullIntro = section.paragraphs.join(' ').trim();
  if (section.items.length) return { intro: fullIntro, items: section.items };

  const markers = [...fullIntro.matchAll(/Movimento\s+(\d+)\s*:\s*/gi)];
  if (!markers.length) {
    return {
      intro: '',
      items: [{ title: '', text: fullIntro || 'Aplique os próximos movimentos com constância.' }]
    };
  }

  return {
    intro: fullIntro.slice(0, markers[0].index).trim(),
    items: markers.map((marker, index) => ({
      title: `Movimento ${marker[1]}`,
      text: fullIntro.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? fullIntro.length).trim()
    }))
  };
}

function drawActionPages(doc, state, section) {
  const { intro, items } = parseActionContent(section);
  let index = 0;
  let y = 0;
  const newPage = () => {
    addPage(doc, state, { background: C.white, label: 'Plano de ação' });
    kicker(doc, 'MOVIMENTOS CONCRETOS', PAGE.margin, 75);
    title(doc, index ? 'Continuação do plano de ação' : 'Da paralisia para a prática', PAGE.margin, 98, PAGE.width - PAGE.margin * 2, 27);
    if (!index && intro) {
      doc.font('Helvetica').fontSize(10.3).fillColor(C.body).text(intro, PAGE.margin, 145, { width: PAGE.width - PAGE.margin * 2, lineGap: 3 });
      y = Math.max(190, doc.y + 20);
    } else y = 155;
  };
  newPage();
  while (index < items.length) {
    const item = items[index];
    const fullText = [item.title, item.text].filter(Boolean).join(' ');
    doc.font('Helvetica').fontSize(10.2);
    const textHeight = doc.heightOfString(fullText, { width: PAGE.width - PAGE.margin * 2 - 70, lineGap: 3.2 });
    const cardHeight = Math.max(128, textHeight + 54);
    if (y + cardHeight > PAGE.bottom - 16) { newPage(); continue; }
    const fills = [C.pale, '#FFF4CE', C.cream];
    roundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, cardHeight, fills[index % fills.length], 15, C.line);
    doc.circle(PAGE.margin + 30, y + 30, 17).fill(index % 3 === 1 ? '#B88700' : C.green);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.white).text(String(index + 1), PAGE.margin + 20, y + 24, { width: 20, align: 'center' });
    if (item.title) {
      doc.font('Helvetica-Bold').fontSize(12.8).fillColor(C.ink).text(item.title, PAGE.margin + 58, y + 20, { width: PAGE.width - PAGE.margin * 2 - 78 });
      doc.font('Helvetica').fontSize(10.2).fillColor(C.body).text(item.text, PAGE.margin + 22, y + 58, { width: PAGE.width - PAGE.margin * 2 - 44, lineGap: 3.2 });
    } else doc.font('Helvetica').fontSize(10.2).fillColor(C.body).text(item.text, PAGE.margin + 58, y + 22, { width: PAGE.width - PAGE.margin * 2 - 78, lineGap: 3.2 });
    y += cardHeight + 15;
    index += 1;
  }
}

function drawClosing(doc, state, section) {
  addPage(doc, state, { background: C.charcoal });
  kicker(doc, '8. FECHAMENTO + CONVITE', PAGE.margin, 73, C.yellow);
  title(doc, 'O diagnóstico nomeia.\nA primeira ação transforma.', PAGE.margin, 100, PAGE.width - PAGE.margin * 2, 28, C.white);
  roundedCard(doc, PAGE.margin, 196, PAGE.width - PAGE.margin * 2, 326, C.white, 18);
  writeNarrative(doc, state, section.paragraphs.join('\n\n'), { x: PAGE.margin + 27, y: 225, width: PAGE.width - PAGE.margin * 2 - 54, height: 264, label: 'Fechamento', sectionNumber: 8, heading: 'Fechamento + convite' });
  kicker(doc, 'SEU PRÓXIMO PASSO', PAGE.margin, 555, '#CFF8DE');
  roundedCard(doc, PAGE.margin, 581, PAGE.width - PAGE.margin * 2, 145, C.pale, 16);
  doc.circle(PAGE.margin + 34, 616, 19).fill(C.green);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white).text('>', PAGE.margin + 23, 609, { width: 22, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.ink).text(IRC_NEXT_STEPS_TITLE, PAGE.margin + 64, 601, { width: PAGE.width - PAGE.margin * 2 - 88 });
  doc.font('Helvetica').fontSize(9.5).fillColor(C.body).text(IRC_NEXT_STEPS_TEXT, PAGE.margin + 64, 641, { width: PAGE.width - PAGE.margin * 2 - 88, lineGap: 3 });
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.tech').replace(/\/+$/, '');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.green).text('ASSISTIR À AULA DA PLANILHA', PAGE.margin + 64, 697, { width: 220, link: `${siteUrl}${IRC_ZEROAPP_LESSON_PATH}`, underline: true });
}

export function buildIrcPdf({ name, report, answers, generatedAt, visuals = {} }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, compress: true, info: { Title: 'Diagnóstico Financeiro Completo', Author: 'Finanças do Zero | Jackson Souza', Subject: `Relatório personalizado de ${name}` } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    const state = { page: 0, displayName: String(name || 'Você').trim() || 'Você' };
    const canonicalAnswers = canonicalizeAnswers(answers) || [];
    const sections = parseIrcReport(report);
    drawCover(doc, state, visuals.cover, canonicalAnswers, generatedAt);
    drawMap(doc, state, canonicalAnswers);
    for (let number = 1; number <= 6; number += 1) {
      drawNarrativeSection(doc, state, sectionByNumber(sections, number), canonicalAnswers, number === 3 ? visuals.cycle : number === 6 ? visuals.future : null);
    }
    drawMethodOverview(doc, state);
    drawActionPages(doc, state, sectionByNumber(sections, 7));
    drawClosing(doc, state, sectionByNumber(sections, 8));
    doc.end();
  });
}
