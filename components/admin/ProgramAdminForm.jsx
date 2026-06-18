'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INITIAL_FORM = {
  title: '',
  description: '',
  thumbnail_url: '',
  tier_required: 'LIVRE',
  turma_exclusiva: '',
  visibility: 'visible',
  is_published: false,
  order_index: 0
};

const TIER_OPTIONS = [
  { value: 'LIVRE', label: 'Livre' },
  { value: 'MOVIMENTO', label: 'Mentorado' },
  { value: 'ACELERACAO', label: 'Aceleração' },
  { value: 'AUTOGOVERNO', label: 'Autogoverno' }
];

const VISIBILITY_OPTIONS = [
  { value: 'visible', label: '● Visível' },
  { value: 'locked', label: '🔒 Bloqueado' },
  { value: 'hidden', label: '👁 Oculto' }
];

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
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (typeof payload?.raw === 'string' && payload.raw.trim()) return payload.raw.trim();
  return `${fallback} (${response.status})`;
}

function buildInitialForm(program) {
  if (!program) return INITIAL_FORM;
  return {
    title: String(program.title || ''),
    description: String(program.description || ''),
    thumbnail_url: String(program.thumbnail_url || ''),
    tier_required: String(program.tier_required || 'LIVRE'),
    turma_exclusiva: String(program.turma_exclusiva || ''),
    visibility: String(program.visibility || 'visible'),
    is_published: Boolean(program.is_published),
    order_index: Number(program.order_index || 0)
  };
}

export default function ProgramAdminForm({ mode = 'create', initialProgram = null, variant = 'screen', onCancel, onSaved }) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const isEmbedded = variant === 'embedded';
  const [form, setForm] = useState(() => buildInitialForm(initialProgram));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(buildInitialForm(initialProgram));
    setError('');
  }, [initialProgram]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push('/admin/conteudo/programas');
  };

  const handleSubmit = async (publishValue = form.is_published) => {
    setError('');
    setIsSaving(true);

    try {
      const url = isEdit && initialProgram?.id ? `/api/admin/programs/${initialProgram.id}` : '/api/admin/programs';
      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          is_published: publishValue,
          turma_exclusiva: String(form.turma_exclusiva || '').trim() || null,
          order_index: Number.parseInt(String(form.order_index || 0), 10) || 0
        })
      });
      const payload = await parsePayload(response);
      if (!response.ok) throw new Error(resolveError(response, payload, isEdit ? 'Erro ao atualizar programa' : 'Erro ao salvar programa'));

      if (onSaved) {
        await onSaved(payload?.program);
        return;
      }

      router.push('/admin/conteudo/programas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar programa');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={isEmbedded ? 'program-form-panel' : 'program-form-screen'}>
      <div className="shell">
        <header className="header">
          <button type="button" className="back-btn" onClick={handleCancel}>
            ← voltar
          </button>
          <h1>{isEdit ? 'Editar Programa' : 'Novo Programa'}</h1>
          <p>{isEdit ? 'Atualize acesso, publicação, imagem e organização do programa.' : 'Estrutura de conteúdo da área de membros.'}</p>
        </header>

        <section className="form-card">
          <label>
            Título *
            <input value={form.title} onChange={(event) => setField('title', event.target.value)} maxLength={140} required />
            <small>💡 Use º (ordinal) em vez da letra o: ex: 1º Encontro</small>
          </label>

          <label>
            Descrição
            <textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={4} maxLength={360} />
          </label>

          <label>
            URL da capa
            <input type="url" value={form.thumbnail_url} onChange={(event) => setField('thumbnail_url', event.target.value)} />
          </label>

          <label>
            Tier de acesso
            <select value={form.tier_required} onChange={(event) => setField('tier_required', event.target.value)}>
              {TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Turma exclusiva
            <input
              value={form.turma_exclusiva}
              onChange={(event) => setField('turma_exclusiva', event.target.value)}
              placeholder='Ex: "Workshop, Maio 2026"'
              maxLength={160}
            />
            <small>Separe múltiplas turmas por vírgula. Vazio libera para todos os usuários elegíveis pelo tier.</small>
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
          </label>

          <label>
            Ordem
            <input type="number" min={0} value={form.order_index} onChange={(event) => setField('order_index', event.target.value)} />
          </label>

          <label className="publish-row">
            <input type="checkbox" checked={form.is_published} onChange={(event) => setField('is_published', event.target.checked)} />
            <span>Publicado</span>
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <div className="actions">
            <button type="button" className="btn ghost" disabled={isSaving} onClick={handleCancel}>
              Cancelar
            </button>
            {isEdit ? (
              <button type="button" className="btn publish" disabled={isSaving} onClick={() => handleSubmit(form.is_published)}>
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            ) : (
              <>
                <button type="button" className="btn draft" disabled={isSaving} onClick={() => handleSubmit(false)}>
                  Salvar rascunho
                </button>
                <button type="button" className="btn publish" disabled={isSaving} onClick={() => handleSubmit(true)}>
                  {isSaving ? 'Salvando...' : 'Publicar'}
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .program-form-screen {
          min-height: 100vh;
          background: radial-gradient(circle at top right, var(--green-dim), transparent 42%), var(--bg-deep);
          color: var(--text);
          padding: 18px 14px 34px;
        }

        .program-form-panel {
          color: var(--text);
        }

        .shell {
          max-width: 880px;
          margin: 0 auto;
        }

        .program-form-panel .shell {
          max-width: none;
        }

        .header {
          margin-bottom: 14px;
        }

        .back-btn,
        .btn {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 800;
          padding: 9px 12px;
          cursor: pointer;
        }

        h1 {
          margin: 12px 0 4px;
          font-size: 30px;
          font-family: var(--font-display);
        }

        .program-form-panel h1 {
          font-size: 24px;
        }

        p {
          margin: 0;
          color: var(--text-2);
          font-size: 13px;
        }

        .form-card {
          border: 1px solid var(--border-2);
          border-radius: var(--radius-xl);
          background: var(--bg-card);
          padding: 16px;
          display: grid;
          gap: 14px;
        }

        label {
          display: grid;
          gap: 7px;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 800;
        }

        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid var(--border-2);
          border-radius: var(--radius-md);
          background: var(--bg2);
          color: var(--text);
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
        }

        small {
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: var(--green-mid);
          box-shadow: 0 0 0 3px var(--green-dim);
        }

        .publish-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .publish-row input {
          width: auto;
          accent-color: var(--green);
        }

        .error-box {
          border: 1px solid color-mix(in srgb, var(--red) 30%, transparent);
          border-radius: var(--radius-md);
          background: var(--red-dim);
          color: var(--red);
          padding: 10px 12px;
          font-size: 13px;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn.publish {
          background: var(--green);
          border-color: var(--green);
          color: #04170b;
        }

        .btn.draft {
          border-color: var(--green-mid);
          color: var(--green);
          background: var(--green-dim);
        }
      `}</style>
    </div>
  );
}
