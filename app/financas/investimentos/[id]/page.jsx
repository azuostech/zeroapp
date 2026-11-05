'use client';
import { useParams } from 'next/navigation';
import PositionDetailPage from '@/src/modules/investments/presentation/PositionDetailPage';
export default function Page() { const { id } = useParams(); return <PositionDetailPage id={id} />; }
