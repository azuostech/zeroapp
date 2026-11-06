'use client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import InvestmentsShell from './InvestmentsShell';
import PolicyEditSheet from './PolicyEditSheet';
import { DEFAULT_POLICY_RULES } from '../domain/investments.constants';
import { summarizePolicy } from '../domain/investments.policy';
import { useInvestments } from './useInvestments';
import styles from './investments.module.css';

const ROLE_COPY = {
  mentor: { provenance: 'Ajustada na sessão com o mentor', badge: 'MENTOR' },
  aluno: { provenance: 'Ajustada por você', badge: 'VOCÊ' },
  sistema: { provenance: 'Política padrão do método', badge: 'SISTEMA' }
};
const STATUS_ORDER = { fora: 0, construcao: 1, ok: 2, sem_dados: 3 };
const STATUS_COPY = { fora: 'FORA', ok: 'OK', sem_dados: 'SEM DADOS' };
const RULE_PARAM_NAMES = { months: 'meses', pct: 'percentual', amount: 'limite FGC' };

const dateLabel = (date) => date ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
const roleLabel = (role) => ROLE_COPY[role]?.badge || 'SISTEMA';
const stableRules = (rules = []) => [...rules].sort((a, b) => a.type.localeCompare(b.type));

function LabelWithMonoNumbers({ children }) {
  return String(children).split(/(\d+(?:[.,]\d+)?%?)/).map((part, index) => /^\d/.test(part) ? <span className={styles.money} key={`${part}-${index}`}>{part}</span> : part);
}

export function policyVersionChanges(current, previous) {
  if (!previous) return ['Política criada'];
  const oldRules = new Map((previous.rules || []).map((rule) => [rule.type, rule]));
  const changes = [];
  for (const rule of stableRules(current.rules || [])) {
    const before = oldRules.get(rule.type);
    if (!before) { changes.push('Regra adicionada'); continue; }
    if ((rule.enabled !== false) !== (before.enabled !== false)) changes.push(`${rule.enabled !== false ? 'Ativou' : 'Desativou'} uma regra`);
    for (const [key, value] of Object.entries(rule.params || {})) if (value !== before.params?.[key]) changes.push(`${RULE_PARAM_NAMES[key] || key}: ${before.params?.[key] ?? '—'} → ${value}`);
  }
  if ((current.mentor_note || '') !== (previous.mentor_note || '')) changes.push('Palavra do mentor atualizada');
  return changes.length ? changes : ['Sem mudança nos parâmetros'];
}

function VersionsSheet({ versions, onClose }) {
  useEffect(() => { const close = (event) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  return <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="versions-title"><div className={styles.sheetHandle} /><div className={styles.sheetHead}><h2 id="versions-title">Versões da política</h2><button type="button" onClick={onClose} aria-label="Fechar">×</button></div><div className={styles.versionList}>{versions.map((version, index) => <article className={styles.versionItem} key={version.id || version.version}><div><b>Versão {version.version}</b><span>{dateLabel(version.created_at)} · {roleLabel(version.created_by_role)}</span></div><ul>{policyVersionChanges(version, versions[index + 1]).map((change, changeIndex) => <li key={`${change}-${changeIndex}`}>{change}</li>)}</ul></article>)}</div></section></div>;
}

export default function PolicyPage({ adminViewUserId }) {
  const { data, loading, error, refresh } = useInvestments('/api/investments/policy', adminViewUserId);
  const [editOpen, setEditOpen] = useState(false); const [versionsOpen, setVersionsOpen] = useState(false); const [versions, setVersions] = useState([]); const [versionsLoading, setVersionsLoading] = useState(false);
  const ordered = useMemo(() => [...(data?.results || [])].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]), [data]);
  if (loading) return <InvestmentsShell title="Minha política" subtitle="As regras que você combinou com você mesmo." adminViewUserId={adminViewUserId}><div className={styles.skeleton} /></InvestmentsShell>;
  if (error) return <InvestmentsShell title="Minha política" adminViewUserId={adminViewUserId}><p className={styles.error}>{error}</p></InvestmentsShell>;
  const policy = data.policy || { version: 1, rules: DEFAULT_POLICY_RULES, created_by_role: 'sistema', created_at: null }; const score = summarizePolicy(ordered); const role = ROLE_COPY[policy.created_by_role] || ROLE_COPY.sistema;
  async function showVersions() { setVersionsLoading(true); setVersionsOpen(true); try { const response = await fetch(`/api/investments/policy/versions${adminViewUserId ? `?user_id=${encodeURIComponent(adminViewUserId)}` : ''}`, { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar as versões'); setVersions(payload.data || []); } catch (reason) { toast.error(reason.message); setVersionsOpen(false); } finally { setVersionsLoading(false); } }
  return <InvestmentsShell title="Minha política" subtitle="As regras que você combinou com você mesmo." adminViewUserId={adminViewUserId}>
    <section className={`${styles.card} ${styles.policyVersion}`}><span className={styles.shield} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /></svg></span><div><b>Versão {policy.version} · {dateLabel(policy.created_at)}</b><p>{role.provenance}</p></div><span className={styles.authorBadge}>{role.badge}</span></section>
    <section className={styles.policyScore} aria-label="Placar da política"><div className={styles.scoreOk}><b>{score.ok}</b><span>cumpridas</span></div><div className={styles.scoreBuilding}><b>{score.construcao}</b><span>em construção</span></div><div className={styles.scoreOutside}><b>{score.fora}</b><span>fora da regra</span></div></section>
    <div className={styles.sectionHead}><h2>SUAS REGRAS</h2></div>
    <div className={styles.policyRules}>{ordered.map((result) => { const badge = result.status === 'construcao' ? `${result.progressPct || 0}%` : STATUS_COPY[result.status]; return <article className={`${styles.policyRule} ${styles[`policy_${result.status}`] || ''}`} key={result.type}><div className={styles.policyRuleTop}><b><LabelWithMonoNumbers>{result.label}</LabelWithMonoNumbers></b><span>{badge}</span></div><p>{result.detail}</p>{result.status === 'construcao' ? <div className={`${styles.bar} ${styles.barGold}`}><i style={{ width: `${result.progressPct || 0}%` }} /></div> : null}{result.status === 'sem_dados' ? <button className={styles.textLink} type="button" onClick={() => setEditOpen(true)}>Completar esta regra</button> : null}</article>; })}</div>
    {policy.mentor_note ? <section className={`${styles.card} ${styles.dark} ${styles.mentorWord}`}><span>PALAVRA DO MENTOR</span><p>{policy.mentor_note}</p></section> : null}
    <div className={styles.buttonRow}><button className={styles.button} type="button" onClick={() => setEditOpen(true)}>Editar regras</button><button className={`${styles.button} ${styles.secondary}`} type="button" onClick={showVersions}>Ver versões</button></div>
    <p className={styles.disclaimer}>Você ou seu mentor podem editar. Cada mudança cria uma nova versão com autor e data.</p>
    {editOpen ? <PolicyEditSheet policy={policy} isAdmin={Boolean(adminViewUserId)} userId={adminViewUserId} onClose={() => setEditOpen(false)} onSaved={refresh} /> : null}
    {versionsOpen ? versionsLoading ? <div className={styles.sheetBackdrop}><section className={styles.sheet}><div className={styles.sheetHandle} /><div className={styles.skeleton} /></section></div> : <VersionsSheet versions={versions} onClose={() => setVersionsOpen(false)} /> : null}
  </InvestmentsShell>;
}
