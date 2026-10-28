'use client';
import { useState } from 'react'; import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader'; import BottomNav from '@/components/layout/BottomNav'; import FAB from '@/components/layout/FAB'; import JacksonAIModal from '@/components/layout/JacksonAIModal';
import styles from './patrimony.module.css';
import MentorSessionBanner from './MentorSessionBanner';
export function buildPatrimonyHref(path = '', userId = null) { return userId ? `/admin/users/${encodeURIComponent(userId)}/patrimonio${path}` : `/financas/patrimonio${path}`; }
export default function PatrimonyShell({ title, subtitle, adminViewUserId, children }) { const [open,setOpen]=useState(false); return <div className={`${styles.shell} ${adminViewUserId ? styles.adminShell : ''}`}>{adminViewUserId?<MentorSessionBanner userId={adminViewUserId}/>:<AppHeader/>}<header className={styles.head}><Link className={styles.back} href={buildPatrimonyHref('',adminViewUserId)}>← voltar</Link><h1>{title}</h1>{subtitle?<p>{subtitle}</p>:null}</header><main className={styles.main}>{children}</main>{!adminViewUserId?<><BottomNav activeTab="financas"/><FAB onClick={()=>setOpen(true)}/><JacksonAIModal isOpen={open} onClose={()=>setOpen(false)}/></>:null}</div>; }
