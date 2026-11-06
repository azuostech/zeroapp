'use client';
import { FEELINGS, RESGATE_REASONS } from '../domain/investments.constants';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';
import { useInvestments } from './useInvestments';
import styles from './investments.module.css';

const date = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
export default function MentorDecisionsCard({ userId }) {
  const { data, loading, error } = useInvestments('/api/investments/decisions', userId);
  if (loading) return <div className={styles.skeleton} />; if (error || !data) return null;
  const items = [...data.redemptions.map((item) => ({ type: 'resgate', date: item.occurred_on, item })), ...data.postponed.map((item) => ({ type: 'adiado', date: item.created_at, item }))].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
  if (!items.length) return null;
  return <section className={`${styles.card} ${styles.mentorDecisions}`}><span className={styles.eyebrow}>DECISÕES DE INVESTIMENTO RECENTES</span><div>{items.map(({ type, item, date: value }) => type === 'resgate' ? <article key={`r-${item.id}`}><time>{date(value)}</time><b>{item.investment_positions?.name || 'Investimento'} · {formatBRL(item.amount)}</b><p>{RESGATE_REASONS[item.reason_code] || item.reason_code} · {FEELINGS[item.feeling] || item.feeling}</p></article> : <article key={`a-${item.id}`}><time>{date(value)}</time><b>Quase resgatou {item.investment_name}</b><p>{FEELINGS[item.context?.feeling] || item.context?.feeling || 'sentimento não informado'} · levou para a sessão</p></article>)}</div></section>;
}
