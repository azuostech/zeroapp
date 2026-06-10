'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeGoogleDriveImageUrl } from '@/src/lib/drive-image-url';

const TYPE_OPTIONS = [
  { value: 'video', label: '🎬 Vídeo' },
  { value: 'pdf', label: '📄 PDF' },
  { value: 'article', label: '📝 Artigo' },
  { value: 'tool', label: '🔧 Ferramenta' }
];

const TIER_OPTIONS = [
  {
    value: 'LIVRE',
    label: '🌱 Livre — todos',
    description: 'Qualquer usuário cadastrado.'
  },
  {
    value: 'MOVIMENTO',
    label: '🎓 Mentorado',
    description: 'Tier MOVIMENTO ou superior.'
  },
  {
    value: 'ACELERACAO',
    label: '⚡ Aceleração',
    description: 'Tier ACELERACAO ou superior.'
  },
  {
    value: 'AUTOGOVERNO',
    label: '💎 Autogoverno',
    description: 'Apenas tier AUTOGOVERNO.'
  }
];

const INITIAL_FORM = {
  title: '',
  description: '',
  content_type: 'video',
  tier_required: 'LIVRE',
  url: '',
  thumbnail_url: '',
  order_index: 0,
  is_published: false,
  turma_exclusiva: '',
  disponivel_em: '',
  session_id: '',
  visibility: 'visible'
};

const VISIBILITY_OPTIONS = [
  { value: 'visible', label: '● Visível' },
  { value: 'locked', label: '🔒 Bloqueado' },
  { value: 'hidden', label: '👁 Oculto' }
];

function parseDomain(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('youtube.com') || host.includes('youtu.be')) return { icon: '▶️', label: 'YouTube' };
    if (host.includes('drive.google.com')) return { icon: '📁', label: 'Google Drive' };
    if (host.includes('notion.so')) return { icon: '🧠', label: 'Notion' };
    if (host.includes('vimeo.com')) return { icon: '🎞️', label: 'Vimeo' };
    return { icon: '🔗', label: host };
  } catch (_) {
    return null;
  }
}

async function parsePayload(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { raw };
  }
}

function resolveError(response, payload, fallback) {
  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim();
  }
  const raw = typeof payload?.raw === 'string' ? payload.raw.trim() : '';
  const contentType = response.headers?.get?.('content-type') || '';
  const isHtmlError =
    contentType.includes('text/html') ||
    raw.toLowerCase().startsWith('<!doctype') ||
    raw.toLowerCase().startsWith('<html') ||
    raw.includes('__NEXT_DATA__');
  if (raw && !isHtmlError) return raw;
  return `${fallback} (${response.status})`;
}

function formatReleasePreview(dateValue) {
  const value = String(dateValue || '').trim();
  if (!value) return '';

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function ContentAdminForm({ mode = 'create', contentId = null }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [presetSessionId, setPresetSessionId] = useState('');

  const isEdit = mode === 'edit';
  const heading = isEdit ? 'Editar Conteúdo' : 'Novo Conteúdo';
  const domainMeta = useMemo(() => parseDomain(form.url), [form.url]);
  const releasePreview = useMemo(() => formatReleasePreview(form.disponivel_em), [form.disponivel_em]);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === form.session_id) || null,
    [form.session_id, sessions]
  );

  useEffect(() => {
    let active = true;

    const loadSessions = async () => {
      try {
        const response = await fetch('/api/admin/programs', { cache: 'no-store' });
        const payload = await parsePayload(response);
        if (!response.ok) return;
        const nextSessions = [];
        for (const program of payload?.programs || []) {
          for (const session of program?.content_sessions || []) {
            nextSessions.push({
              ...session,
              program_title: program?.title || 'Programa',
              program_order: Number(program?.order_index || 0)
            });
          }
        }
        if (active) {
          setSessions(
            nextSessions.sort(
              (a, b) =>
                Number(a?.program_order || 0) - Number(b?.program_order || 0) ||
                Number(a?.order_index || 0) - Number(b?.order_index || 0)
            )
          );
        }
      } catch (_) {
        if (active) setSessions([]);
      }
    };

    loadSessions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isEdit || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setPresetSessionId(String(params.get('session_id') || '').trim());
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || !presetSessionId) return;
    setForm((current) => (current.session_id ? current : { ...current, session_id: presetSessionId }));
  }, [isEdit, presetSessionId]);

  useEffect(() => {
    if (!isEdit || !contentId) return;

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/content/${contentId}`, { cache: 'no-store' });
        const payload = await parsePayload(response);
        if (!response.ok) {
          throw new Error(resolveError(response, payload, 'Erro ao carregar conteúdo'));
        }

        const content = payload?.content || {};
        if (!active) return;
        setForm({
          title: String(content.title || ''),
          description: String(content.description || ''),
          content_type: String(content.content_type || 'video'),
          tier_required: String(content.tier_required || 'LIVRE'),
          url: String(content.url || ''),
          thumbnail_url: String(content.thumbnail_url || ''),
          order_index: Number(content.order_index || 0),
          is_published: Boolean(content.is_published),
          turma_exclusiva: String(content.turma_exclusiva || ''),
          disponivel_em: String(content.disponivel_em || ''),
          session_id: String(content.session_id || ''),
          visibility: String(content.visibility || 'visible')
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdo');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [contentId, isEdit]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (publishValue) => {
    setError('');
    setIsSaving(true);

    try {
      const normalizedThumbnail = normalizeGoogleDriveImageUrl(form.thumbnail_url);
      const payload = {
        ...form,
        order_index: Number.parseInt(String(form.order_index || 0), 10) || 0,
        is_published: Boolean(publishValue),
        thumbnail_url: normalizedThumbnail,
        turma_exclusiva: String(form.turma_exclusiva || '').trim() || null,
        disponivel_em: String(form.disponivel_em || '').trim() || null,
        session_id: String(form.session_id || '').trim() || null,
        visibility: String(form.visibility || 'visible').trim()
      };

      const response = await fetch(isEdit ? `/api/admin/content/${contentId}` : '/api/admin/content', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const parsed = await parsePayload(response);
      if (!response.ok) {
        throw new Error(resolveError(response, parsed, 'Erro ao salvar conteúdo'));
      }

      router.push('/admin/conteudo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conteúdo');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="state-wrap">
        <div className="state-card">Carregando conteúdo...</div>
        <style jsx>{`
          .state-wrap {
            min-height: 100vh;
            background: #101010;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .state-card {
            border: 1px solid #303030;
            background: #1a1a1a;
            border-radius: 12px;
            padding: 14px 18px;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-content-form-screen">
      <div className="shell">
        <header className="header">
          <button type="button" className="back-btn" onClick={() => router.push('/admin/conteudo')}>
            ← voltar
          </button>
          <h1>{heading}</h1>
          <p>O app controla o acesso por tier e abre o link em nova aba.</p>
        </header>

        <section className="form-card">
          {selectedSession ? (
            <div className="session-context">
              <strong>{selectedSession.program_title}</strong>
              <span>{selectedSession.title}</span>
            </div>
          ) : null}

          <label>
            Título *
            <input
              type="text"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              placeholder="Nome do conteúdo"
              maxLength={140}
              required
            />
            <small className="field-tip">💡 Use º (ordinal) em vez da letra o: ex: 1º Encontro</small>
          </label>

          <label>
            Descrição
            <textarea
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Breve resumo do conteúdo"
              maxLength={300}
              rows={4}
            />
            <span className="field-tip">{String(form.description || '').length}/300</span>
          </label>

          <label>
            Tipo de conteúdo *
            <select value={form.content_type} onChange={(event) => setField('content_type', event.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nível de acesso *
            <select value={form.tier_required} onChange={(event) => setField('tier_required', event.target.value)}>
              {TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="tier-help">
            {TIER_OPTIONS.map((option) => (
              <p key={option.value}>
                <strong>{option.label}:</strong> {option.description}
              </p>
            ))}
          </div>

          <label>
            Exclusivo para turma
            <input
              type="text"
              value={form.turma_exclusiva}
              onChange={(event) => setField('turma_exclusiva', event.target.value)}
              placeholder="Ex: Maio 2026 — deixe vazio para todos os mentorados"
              maxLength={80}
            />
            <span className="field-tip">
              Se preenchido, apenas alunos desta turma verão este conteúdo. Outras turmas não verão nem o card.
            </span>
          </label>

          <label>
            Data de liberação
            <input
              type="date"
              value={form.disponivel_em}
              onChange={(event) => setField('disponivel_em', event.target.value)}
            />
            <span className="field-tip">
              Se preenchida, o card aparece bloqueado até esta data. Libera automaticamente quando a data chega.
            </span>
            {releasePreview ? <span className="field-tip release-preview">Liberará em {releasePreview}</span> : null}
          </label>

          <label>
            Sessão
            <select value={form.session_id} onChange={(event) => setField('session_id', event.target.value)}>
              <option value="">Sem sessão (avulso)</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.program_title} · {session.title}
                </option>
              ))}
            </select>
            <span className="field-tip">Organiza esta aula dentro de um programa da área de membros.</span>
          </label>

          <label>
            Visibilidade
            <select value={form.visibility} onChange={(event) => setField('visibility', event.target.value)}>
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="field-tip">Controla exibição sem substituir o status de publicação.</span>
          </label>

          <label>
            URL do conteúdo *
            <input
              type="url"
              value={form.url}
              onChange={(event) => setField('url', event.target.value)}
              placeholder="https://youtu.be/... ou https://drive.google.com/..."
              required
            />
            <span className="field-tip">O conteúdo abre em nova aba. O app controla quem pode ver o link.</span>
          </label>

          {domainMeta ? (
            <div className="url-preview">
              {domainMeta.icon} Origem detectada: <strong>{domainMeta.label}</strong>
            </div>
          ) : null}

          <label>
            URL da thumbnail
            <input
              type="url"
              value={form.thumbnail_url}
              onChange={(event) => setField('thumbnail_url', event.target.value)}
              onBlur={(event) => {
                const normalized = normalizeGoogleDriveImageUrl(event.target.value);
                if (normalized !== form.thumbnail_url) {
                  setField('thumbnail_url', normalized);
                }
              }}
              placeholder="https://img.youtube.com/vi/VIDEO_ID/0.jpg"
            />
            <span className="field-tip">
              Tamanho recomendado: 1280x720 px (16:9). Para YouTube: https://img.youtube.com/vi/VIDEO_ID/0.jpg.
              Links de imagem do Google Drive são convertidos automaticamente.
            </span>
          </label>

          <label>
            Ordem de exibição
            <input
              type="number"
              value={form.order_index}
              onChange={(event) => setField('order_index', event.target.value)}
              min={0}
            />
            <span className="field-tip">Menor número aparece primeiro.</span>
          </label>

          <label className="publish-label">
            <input
              type="checkbox"
              checked={Boolean(form.is_published)}
              onChange={(event) => setField('is_published', event.target.checked)}
            />
            <span>Publicado</span>
          </label>
          <span className="field-tip">Rascunho não aparece na tela /conteudo.</span>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => router.push('/admin/conteudo')} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="btn draft" onClick={() => handleSubmit(false)} disabled={isSaving}>
              Salvar como rascunho
            </button>
            <button type="button" className="btn publish" onClick={() => handleSubmit(true)} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Publicar'}
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .admin-content-form-screen {
          min-height: 100vh;
          background: radial-gradient(circle at top right, rgba(66, 165, 245, 0.14), transparent 42%), #0f1113;
          color: #f3f3f3;
          padding: 18px 14px 34px;
        }

        .shell {
          max-width: 880px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 14px;
        }

        .back-btn {
          border: 1px solid #2f363d;
          background: #161b20;
          color: #c3d0da;
          border-radius: 10px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        h1 {
          margin: 12px 0 4px;
          font-size: 30px;
          line-height: 1.15;
        }

        p {
          margin: 0;
          color: #9aa8b3;
          font-size: 13px;
        }

        .form-card {
          border: 1px solid #2f363d;
          background: #171c21;
          border-radius: 14px;
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .session-context {
          border: 1px solid rgba(0, 200, 83, 0.28);
          border-radius: 12px;
          background: rgba(0, 200, 83, 0.1);
          color: #d9ffe8;
          padding: 10px 12px;
          display: grid;
          gap: 3px;
          font-size: 13px;
        }

        .session-context strong {
          color: #00c853;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        label {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        input,
        select,
        textarea {
          border: 1px solid #2f363d;
          background: #11161a;
          border-radius: 10px;
          color: #f3f3f3;
          font-size: 14px;
          padding: 10px 11px;
          font-family: inherit;
        }

        textarea {
          resize: vertical;
        }

        .field-tip {
          color: #8e9ca6;
          font-size: 11px;
          font-weight: 500;
        }

        .release-preview {
          color: #f8d773;
          font-weight: 700;
        }

        .tier-help {
          border: 1px solid #2f363d;
          background: #11161a;
          border-radius: 10px;
          padding: 10px;
          display: grid;
          gap: 6px;
        }

        .tier-help p {
          margin: 0;
          font-size: 12px;
          color: #c4d0d9;
        }

        .url-preview {
          border: 1px solid rgba(66, 165, 245, 0.35);
          background: rgba(66, 165, 245, 0.12);
          color: #b7dfff;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 12px;
        }

        .publish-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
        }

        .publish-label input {
          width: 16px;
          height: 16px;
        }

        .error-box {
          border: 1px solid rgba(255, 95, 95, 0.38);
          background: rgba(255, 95, 95, 0.12);
          color: #ff8f8f;
          border-radius: 10px;
          padding: 10px;
          font-size: 13px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 6px;
        }

        .btn {
          border: 1px solid #2f363d;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          color: #f3f3f3;
          background: transparent;
        }

        .btn.draft {
          border-color: #ffcc66;
          color: #ffcc66;
        }

        .btn.publish {
          border-color: #00c853;
          background: #00c853;
          color: #041308;
        }

        @media (max-width: 760px) {
          h1 {
            font-size: 26px;
          }

          .actions {
            justify-content: stretch;
          }

          .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
