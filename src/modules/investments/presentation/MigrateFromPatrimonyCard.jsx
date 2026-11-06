'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { investmentsMutation, useInvestments } from './useInvestments';
import styles from './investments.module.css';

export default function MigrateFromPatrimonyCard({ userId, onMigrated }) {
  const { data, loading, refresh } = useInvestments('/api/investments/migrate-from-patrimony', userId); const [selected, setSelected] = useState([]); const [goalMap, setGoalMap] = useState({}); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!data?.candidates) return; setSelected(data.candidates.map((item) => item.id)); setGoalMap(Object.fromEntries(data.candidates.map((item) => [item.id, data.goals.find((goal) => goal.kind === (item.category === 'reserva' ? 'reserva_liquidez' : 'independencia'))?.id || '']))); }, [data]);
  if (loading || !data?.candidates?.length) return null;
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  async function migrate() { setSaving(true); try { const result = await investmentsMutation('/api/investments/migrate-from-patrimony', { method: 'POST', body: JSON.stringify({ asset_ids: selected, goal_map: goalMap }) }, userId); toast.success(`${result.migrated} ${result.migrated === 1 ? 'item trazido' : 'itens trazidos'}`); await refresh(); await onMigrated?.(); } catch (error) { toast.error(error.message); } finally { setSaving(false); } }
  return <section className={`${styles.card} ${styles.migrationCard}`}><span className={styles.eyebrow}>TRAZER DO PATRIMÔNIO</span><h2>Você já lançou {data.candidates.length} {data.candidates.length === 1 ? 'investimento' : 'investimentos'} no Patrimônio. Trazer para cá?</h2><div className={styles.migrationList}>{data.candidates.map((asset) => <div key={asset.id}><label><input type="checkbox" checked={selected.includes(asset.id)} onChange={() => toggle(asset.id)} /><span><b>{asset.name}</b><small>{formatBRL(asset.current_value)}</small></span></label><select aria-label={`Objetivo de ${asset.name}`} value={goalMap[asset.id] || ''} onChange={(event) => setGoalMap({ ...goalMap, [asset.id]: event.target.value })}>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></div>)}</div><button className={styles.button} type="button" disabled={saving || !selected.length || selected.some((id) => !goalMap[id])} onClick={migrate}>{saving ? 'Trazendo…' : `Trazer ${selected.length} ${selected.length === 1 ? 'item' : 'itens'}`}</button><p className={styles.muted}>Os itens escolhidos deixam de ser somados manualmente no Patrimônio e passam a ser sincronizados por aqui.</p></section>;
}
