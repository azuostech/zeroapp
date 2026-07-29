function renderInline(text) {
  const pieces = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return pieces.map((piece, index) => {
    if (piece.startsWith('**') && piece.endsWith('**')) {
      return <strong key={`${piece}-${index}`}>{piece.slice(2, -2)}</strong>;
    }
    return piece;
  });
}

export default function IrcReport({ report }) {
  const lines = String(report || '').split(/\r?\n/);
  const nodes = [];
  let paragraphs = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraphs.length) return;
    nodes.push(<p key={`p-${nodes.length}`}>{renderInline(paragraphs.join(' '))}</p>);
    paragraphs = [];
  };
  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {list.map((item, index) => <li key={`${item}-${index}`}>{renderInline(item)}</li>)}
      </ul>
    );
    list = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      flushParagraph();
      flushList();
      nodes.push(<h2 key={`h-${nodes.length}`}>{line.slice(2, -2)}</h2>);
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^([-*]|\d+[.)])\s+/, ''));
      continue;
    }
    flushList();
    paragraphs.push(line);
  }
  flushParagraph();
  flushList();

  return <article className="irc-report-content">{nodes}</article>;
}
