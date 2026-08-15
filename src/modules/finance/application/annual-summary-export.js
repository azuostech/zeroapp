import PDFDocument from 'pdfkit';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let current = index;
  let result = '';
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

function textCell(row, column, value, style = 0) {
  const ref = `${columnName(column)}${row}`;
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(row, column, value, style = 0, formula = '') {
  const ref = `${columnName(column)}${row}`;
  const formulaXml = formula ? `<f>${escapeXml(formula)}</f>` : '';
  return `<c r="${ref}" s="${style}">${formulaXml}<v>${safeNumber(value)}</v></c>`;
}

function xmlRow(number, cells, height = null) {
  return `<row r="${number}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cells.join('')}</row>`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipEntries(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function stylesXml() {
  return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <numFmts count="2"><numFmt numFmtId="164" formatCode="[$R$-pt-BR] #,##0.00;[Red]-[$R$-pt-BR] #,##0.00;-"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
    <fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FF176B32"/><name val="Aptos Display"/></font></fonts>
    <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF176B32"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF7ED"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F5F3"/><bgColor indexed="64"/></patternFill></fill></fills>
    <borders count="2"><border/><border><bottom style="thin"><color rgb="FFDDE5DF"/></bottom></border></borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="11">
      <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
      <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
      <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf>
      <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
      <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"><alignment horizontal="right"/></xf>
      <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1"><alignment horizontal="right"/></xf>
      <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
      <xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyNumberFormat="1"><alignment horizontal="right"/></xf>
      <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0"><alignment vertical="center" indent="1"/></xf>
      <xf numFmtId="164" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyNumberFormat="1"><alignment horizontal="right"/></xf>
      <xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyNumberFormat="1"><alignment horizontal="right"/></xf>
    </cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  </styleSheet>`;
}

function worksheetXml({ rows, maxRow, maxColumn, merges = [], freezeRow = 0, autoFilter = '' }) {
  const pane = freezeRow
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(maxColumn)}${maxRow}"/>${pane}<sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="13" width="13" customWidth="1"/><col min="14" max="14" width="16" customWidth="1"/><col min="15" max="15" width="14" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData>${autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ''}${merges.length ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/></worksheet>`;
}

function summarySheet(summary, clientName) {
  const rows = [];
  rows.push(xmlRow(1, [textCell(1, 1, 'Resumo Financeiro Anual', 1)], 28));
  rows.push(xmlRow(2, [textCell(2, 1, `${clientName || 'Cliente'} - ${summary.year} - somente valores realizados`, 2)]));
  rows.push(xmlRow(4, [textCell(4, 1, 'Receita anual', 6), numberCell(4, 2, summary.totals.revenue, 7), textCell(4, 5, 'Saídas anuais', 6), numberCell(4, 6, summary.totals.expenses, 9), textCell(4, 9, 'Saldo anual', 6), numberCell(4, 10, summary.totals.balance, 7)]));
  const headerRow = 7;
  rows.push(xmlRow(headerRow, [textCell(headerRow, 1, 'Bloco', 3), ...MONTH_LABELS.map((label, index) => textCell(headerRow, index + 2, label, 3)), textCell(headerRow, 14, 'Total anual', 3), textCell(headerRow, 15, '% da receita', 3)], 25));

  summary.blocks.forEach((block, index) => {
    const row = headerRow + index + 1;
    rows.push(xmlRow(row, [
      textCell(row, 1, block.label, 6),
      ...summary.months.map((month, monthIndex) => numberCell(row, monthIndex + 2, block.monthly?.[month], 4)),
      numberCell(row, 14, block.total, 7, `SUM(B${row}:M${row})`),
      numberCell(row, 15, safeNumber(block.revenuePercentage) / 100, block.key === 'receitas' ? 10 : 5, `IF($N$${headerRow + 1}=0,0,N${row}/$N$${headerRow + 1})`)
    ]));
  });

  const expensesRow = headerRow + summary.blocks.length + 1;
  rows.push(xmlRow(expensesRow, [textCell(expensesRow, 1, 'Total de saídas', 6), ...summary.months.map((month, index) => numberCell(expensesRow, index + 2, summary.totals.expenseMonthly?.[month], 9)), numberCell(expensesRow, 14, summary.totals.expenses, 9, `SUM(B${expensesRow}:M${expensesRow})`), numberCell(expensesRow, 15, safeNumber(summary.totals.expensePercentage) / 100, 10, `IF($N$${headerRow + 1}=0,0,N${expensesRow}/$N$${headerRow + 1})`)]));
  const balanceRow = expensesRow + 1;
  rows.push(xmlRow(balanceRow, [textCell(balanceRow, 1, 'Saldo', 6), ...summary.months.map((month, index) => numberCell(balanceRow, index + 2, summary.totals.balanceMonthly?.[month], 7)), numberCell(balanceRow, 14, summary.totals.balance, 7, `SUM(B${balanceRow}:M${balanceRow})`), numberCell(balanceRow, 15, safeNumber(summary.totals.balancePercentage) / 100, 10, `IF($N$${headerRow + 1}=0,0,N${balanceRow}/$N$${headerRow + 1})`)]));

  return worksheetXml({ rows, maxRow: balanceRow, maxColumn: 15, merges: ['A1:O1', 'A2:O2'], freezeRow: headerRow, autoFilter: `A${headerRow}:O${headerRow + summary.blocks.length}` });
}

function detailsSheet(summary, clientName) {
  const rows = [];
  rows.push(xmlRow(1, [textCell(1, 1, 'Lançamentos realizados por bloco', 1)], 28));
  rows.push(xmlRow(2, [textCell(2, 1, `${clientName || 'Cliente'} - ${summary.year}`, 2)]));
  const headerRow = 4;
  rows.push(xmlRow(headerRow, [textCell(headerRow, 1, 'Bloco / descrição', 3), ...MONTH_LABELS.map((label, index) => textCell(headerRow, index + 2, label, 3)), textCell(headerRow, 14, 'Total anual', 3), textCell(headerRow, 15, '% da receita', 3)], 25));
  let row = headerRow + 1;

  summary.blocks.forEach((block) => {
    if (!block.entries.length) {
      rows.push(xmlRow(row, [textCell(row, 1, `${block.label} - sem lançamentos realizados`, 8)]));
      row += 1;
      return;
    }

    block.entries.forEach((entry) => {
      const label = entry.groupLabel ? `${block.label} / ${entry.groupLabel} / ${entry.label}` : `${block.label} / ${entry.label}`;
      rows.push(xmlRow(row, [
        textCell(row, 1, label, 8),
        ...summary.months.map((month, index) => numberCell(row, index + 2, entry.monthly?.[month], 4)),
        numberCell(row, 14, entry.total, 9, `SUM(B${row}:M${row})`),
        numberCell(row, 15, safeNumber(entry.revenuePercentage) / 100, 5, `IF('Resumo anual'!$N$8=0,0,N${row}/'Resumo anual'!$N$8)`)
      ]));
      row += 1;
    });
  });

  return worksheetXml({ rows, maxRow: Math.max(row - 1, headerRow), maxColumn: 15, merges: ['A1:O1', 'A2:O2'], freezeRow: headerRow, autoFilter: `A${headerRow}:O${Math.max(row - 1, headerRow)}` });
}

export function buildAnnualSummaryXlsx({ summary, clientName }) {
  const createdAt = new Date().toISOString();
  const workbook = `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumo anual" sheetId="1" r:id="rId1"/><sheet name="Lançamentos" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`;
  const entries = [
    { name: '[Content_Types].xml', data: `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Resumo Financeiro Anual ${escapeXml(summary.year)}</dc:title><dc:creator>Finanças do Zero</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: `${XML_HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ZeroApp</Application></Properties>` },
    { name: 'xl/workbook.xml', data: workbook },
    { name: 'xl/_rels/workbook.xml.rels', data: `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: stylesXml() },
    { name: 'xl/worksheets/sheet1.xml', data: summarySheet(summary, clientName) },
    { name: 'xl/worksheets/sheet2.xml', data: detailsSheet(summary, clientName) }
  ];
  return zipEntries(entries);
}

function money(value) {
  return safeNumber(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tableAmount(value) {
  const number = safeNumber(value);
  if (!number) return '-';
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function percentage(value) {
  return `${safeNumber(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function drawPdfTable(doc, { rows, columns, startY, headerFill = '#176B32' }) {
  const left = doc.page.margins.left;
  const rowHeight = 25;
  let y = startY;
  const drawRow = (cells, isHeader = false, fill = null) => {
    if (fill) doc.rect(left, y, columns.reduce((sum, column) => sum + column.width, 0), rowHeight).fill(fill);
    cells.forEach((cell, index) => {
      const column = columns[index];
      const x = left + columns.slice(0, index).reduce((sum, current) => sum + current.width, 0);
      doc.fillColor(isHeader ? '#FFFFFF' : '#26332B').font(isHeader || cell.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 7 : 6.5).text(String(cell.text), x + 3, y + 8, { width: column.width - 6, align: column.align || (index === 0 ? 'left' : 'right'), lineBreak: false, ellipsis: true });
    });
    doc.moveTo(left, y + rowHeight).lineTo(left + columns.reduce((sum, column) => sum + column.width, 0), y + rowHeight).strokeColor('#DDE5DF').lineWidth(0.5).stroke();
    y += rowHeight;
  };
  doc.rect(left, y, columns.reduce((sum, column) => sum + column.width, 0), rowHeight).fill(headerFill);
  drawRow(columns.map((column) => ({ text: column.label })), true);
  rows.forEach((row, index) => drawRow(row.cells, false, row.fill || (index % 2 ? '#F7F9F7' : null)));
  return y;
}

function addPdfTitle(doc, title, subtitle) {
  doc.fillColor('#176B32').font('Helvetica-Bold').fontSize(9).text('FINANCAS DO ZERO', { characterSpacing: 1 });
  doc.moveDown(0.6);
  doc.fillColor('#17231C').font('Helvetica-Bold').fontSize(22).text(title);
  doc.fillColor('#5D6B62').font('Helvetica').fontSize(9).text(subtitle);
}

export function buildAnnualSummaryPdf({ summary, clientName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 30, right: 30, bottom: 38, left: 30 }, bufferPages: true, info: { Title: `Resumo Financeiro Anual ${summary.year}`, Author: 'Finanças do Zero', Subject: clientName || 'Resumo anual' } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
    addPdfTitle(doc, 'Resumo Financeiro Anual', `${clientName || 'Cliente'} - ${summary.year} - somente valores realizados`);
    const kpiY = 90;
    const kpis = [['Receita anual', summary.totals.revenue], ['Saidas anuais', summary.totals.expenses], ['Saldo anual', summary.totals.balance]];
    kpis.forEach(([label, value], index) => {
      const x = 30 + index * 260;
      doc.roundedRect(x, kpiY, 240, 52, 7).fill(index === 1 ? '#F5F7F5' : '#EAF7ED');
      doc.fillColor('#5D6B62').font('Helvetica').fontSize(8).text(label, x + 12, kpiY + 10);
      doc.fillColor(index === 1 ? '#17231C' : '#176B32').font('Helvetica-Bold').fontSize(15).text(money(value), x + 12, kpiY + 25, { width: 216 });
    });

    const columns = [{ label: 'Bloco', width: 140 }, ...MONTH_LABELS.map((label) => ({ label, width: 38 })), { label: 'Total anual', width: 90 }, { label: '% receita', width: 55 }];
    const summaryRows = summary.blocks.map((block) => ({ fill: block.key === 'receitas' ? '#EAF7ED' : null, cells: [{ text: block.label, bold: true }, ...summary.months.map((month) => ({ text: tableAmount(block.monthly?.[month]) })), { text: money(block.total), bold: true }, { text: percentage(block.revenuePercentage), bold: true }] }));
    summaryRows.push({ fill: '#F3F5F3', cells: [{ text: 'Total de saidas', bold: true }, ...summary.months.map((month) => ({ text: tableAmount(summary.totals.expenseMonthly?.[month]), bold: true })), { text: money(summary.totals.expenses), bold: true }, { text: percentage(summary.totals.expensePercentage), bold: true }] });
    summaryRows.push({ fill: '#EAF7ED', cells: [{ text: 'Saldo', bold: true }, ...summary.months.map((month) => ({ text: tableAmount(summary.totals.balanceMonthly?.[month]), bold: true })), { text: money(summary.totals.balance), bold: true }, { text: percentage(summary.totals.balancePercentage), bold: true }] });
    drawPdfTable(doc, { rows: summaryRows, columns, startY: 165 });
    doc.fillColor('#65736A').font('Helvetica').fontSize(7.5).text('Percentuais calculados sobre a receita realizada do periodo.', 30, doc.y + 15);

    summary.blocks.forEach((block) => {
      const detailRows = block.entries.length
        ? block.entries.map((entry) => ({ cells: [{ text: entry.groupLabel ? `${entry.groupLabel} / ${entry.label}` : entry.label, bold: true }, ...summary.months.map((month) => ({ text: tableAmount(entry.monthly?.[month]) })), { text: money(entry.total), bold: true }, { text: percentage(entry.revenuePercentage) }] }))
        : [{ cells: [{ text: 'Nenhum lancamento realizado neste ano.' }, ...summary.months.map(() => ({ text: '-' })), { text: '-' }, { text: '0%' }] }];
      const chunks = Array.from({ length: Math.ceil(detailRows.length / 16) }, (_, index) => detailRows.slice(index * 16, (index + 1) * 16));
      chunks.forEach((chunk, index) => {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
        addPdfTitle(doc, index === 0 ? block.label : `${block.label} - continuacao`, `${clientName || 'Cliente'} - ${summary.year} - lancamentos realizados`);
        drawPdfTable(doc, { rows: chunk, columns, startY: 92 });
      });
    });

    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      const originalBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const y = doc.page.height - 25;
      doc.fillColor('#7A857E').font('Helvetica').fontSize(7).text('zeroapp.tech', 30, y, { lineBreak: false });
      doc.text(`${index + 1} / ${range.count}`, doc.page.width - 80, y, { width: 50, align: 'right', lineBreak: false });
      doc.page.margins.bottom = originalBottomMargin;
    }
    doc.end();
  });
}
