'use client';

import JacksonIAAvatar from '@/components/ai/JacksonIAAvatar';
import ThinkingDots from '@/components/ai/ThinkingDots';

function renderInlineBold(text, keyPrefix) {
  const source = String(text || '');
  const parts = source.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-b-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>;
  });
}

function renderMarkdown(content) {
  const lines = String(content || '').split('\n');
  const nodes = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) return;

    nodes.push(
      <ul key={`list-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`li-${nodes.length}-${index}`}>{renderInlineBold(item, `li-${nodes.length}-${index}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      nodes.push(<div key={`sp-${index}`} className="spacer" />);
      return;
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    nodes.push(
      <p key={`p-${index}`}>
        {renderInlineBold(trimmed, `p-${index}`)}
      </p>
    );
  });

  flushList();

  return nodes;
}

export default function ChatBubble({ message, role, isLoading = false }) {
  const resolvedRole = role || message?.role || 'assistant';
  const content = message?.content || '';

  if (resolvedRole === 'user') {
    return (
      <div className="chat-row user" data-role="user">
        <div className="bubble user-bubble">{renderMarkdown(content)}</div>

        <style jsx>{`
          .chat-row {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0;
          }

          .bubble {
            max-width: min(88%, 560px);
            border-radius: 14px;
            padding: 12px 13px;
          }

          .user-bubble {
            background: var(--green-2);
            color: #000000;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-top-right-radius: var(--radius-xs);
          }

          :global(.user-bubble p),
          :global(.user-bubble ul) {
            margin: 0;
            font-size: 14px;
            line-height: 1.45;
          }

          :global(.user-bubble ul) {
            padding-left: 18px;
          }

          :global(.spacer) {
            height: 6px;
          }

          :global(.user-bubble strong) {
            color: #001d0d;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-row assistant" data-role="assistant">
      <JacksonIAAvatar size="sm" isLoading={isLoading} showStatus={false} />
      <div className="bubble assistant-bubble">{isLoading ? <ThinkingDots /> : renderMarkdown(content)}</div>

      <style jsx>{`
        .chat-row {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 10px 0;
        }

        .bubble {
          max-width: min(88%, 620px);
          border-radius: 14px;
          padding: 12px 13px;
        }

        .assistant-bubble {
          background: var(--bg-elevated);
          border: 1px solid var(--border-2);
          color: var(--text);
          border-top-left-radius: var(--radius-xs);
        }

        :global(.assistant-bubble p),
        :global(.assistant-bubble ul) {
          margin: 0;
          font-size: 14px;
          line-height: 1.45;
        }

        :global(.assistant-bubble ul) {
          padding-left: 18px;
        }

        :global(.spacer) {
          height: 6px;
        }

        :global(.assistant-bubble strong) {
          color: var(--text);
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
