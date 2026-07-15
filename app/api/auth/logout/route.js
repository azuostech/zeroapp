import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
