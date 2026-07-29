import PDFDocument from 'pdfkit';

function parseReport(report) {
  return String(report || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^\*\*[^*]+\*\*$/.test(line)) return { type: 'heading', text: line.slice(2, -2) };
      if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
        return { type: 'list', text: line.replace(/^([-*]|\d+[.)])\s+/, '') };
      }
      return { type: 'paragraph', text: line.replace(/\*\*/g, '') };
    });
}

export function buildIrcPdf({ name, report, generatedAt }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 62, right: 58, bottom: 62, left: 58 },
      bufferPages: true,
      info: {
        Title: 'Diagnóstico Completo IRC',
        Author: 'Finanças do Zero',
        Subject: `Relatório de ${name}`
      }
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fillColor('#087D3D').font('Helvetica-Bold').fontSize(10).text('FINANÇAS DO ZERO', { characterSpacing: 1.2 });
    doc.moveDown(1.2);
    doc.fillColor('#17231C').font('Helvetica-Bold').fontSize(26).text('Diagnóstico Completo');
    doc.fillColor('#087D3D').font('Helvetica').fontSize(12).text('IRC — Identificador e Reprogramador de Crenças');
    doc.moveDown(1.4);
    const boxY = doc.y;
    doc
      .roundedRect(doc.page.margins.left, boxY, 479, 58, 8)
      .fill('#E8F8EF');
    doc.fillColor('#17231C').font('Helvetica-Bold').fontSize(13).text(name, 72, boxY + 14);
    doc
      .fillColor('#526259')
      .font('Helvetica')
      .fontSize(9)
      .text(`Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(generatedAt || Date.now()))}`, 72, boxY + 34);
    doc.y = boxY + 78;

    for (const block of parseReport(report)) {
      if (block.type === 'heading') {
        doc.moveDown(0.9);
        doc.fillColor('#087D3D').font('Helvetica-Bold').fontSize(16).text(block.text, { keepTogether: true });
        doc.moveDown(0.35);
      } else if (block.type === 'list') {
        doc.fillColor('#25342B').font('Helvetica').fontSize(10.5).text(`•  ${block.text}`, {
          indent: 8,
          paragraphGap: 6,
          lineGap: 2
        });
      } else {
        doc.fillColor('#25342B').font('Helvetica').fontSize(10.5).text(block.text, {
          align: 'justify',
          lineGap: 2.5,
          paragraphGap: 8
        });
      }
    }

    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      const originalBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const bottom = doc.page.height - 38;
      doc
        .moveTo(doc.page.margins.left, bottom - 10)
        .lineTo(doc.page.width - doc.page.margins.right, bottom - 10)
        .strokeColor('#DCE8DF')
        .stroke();
      doc.fillColor('#758179').font('Helvetica').fontSize(8).text('zeroapp.tech', doc.page.margins.left, bottom, { lineBreak: false });
      doc.text(`${index + 1} / ${range.count}`, doc.page.width - doc.page.margins.right - 50, bottom, {
        width: 50,
        align: 'right',
        lineBreak: false
      });
      doc.page.margins.bottom = originalBottomMargin;
    }

    doc.end();
  });
}
