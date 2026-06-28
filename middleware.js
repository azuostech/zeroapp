import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { hasStudentAccess } from '@/src/modules/profile/domain/access';

const ROOT_PATH = '/';

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getSafeNextPath(request) {
  const next = request.nextUrl.searchParams.get('next') || '';
  if (!next.startsWith('/') || next.startsWith('//')) return '';
  return next;
}

function redirect(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectToLogin(request) {
  const url = new URL(ROOT_PATH, request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== ROOT_PATH) {
    url.searchParams.set('next', nextPath);
  }
  return NextResponse.redirect(url);
}

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');
  const isProfileApi = pathname.startsWith('/api/profile');
  const isFinanceApi = pathname.startsWith('/api/finance');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isAuthApi = pathname.startsWith('/api/auth');

  const isAppArea = pathname.startsWith('/app');
  const isAdminArea = pathname.startsWith('/admin');
  const isContentArea = pathname.startsWith('/conteudo');
  const isJacksonArea = pathname.startsWith('/jackson-ia');
  const isShamarArea = pathname.startsWith('/shamar');
  const isMavfArea = pathname.startsWith('/mavf');
  const isJornadaArea = pathname.startsWith('/jornada');
  const isTurmaArea = pathname.startsWith('/turma');
  const isShamarApi = pathname.startsWith('/api/shamar');
  const isMavfApi = pathname.startsWith('/api/mavf');
  const isCommunityApi = pathname.startsWith('/api/community');
  const studentOnlyPage = isShamarArea || isMavfArea || isJornadaArea || isTurmaArea;
  const studentOnlyApi = isShamarApi || isMavfApi || isCommunityApi;
  const protectedPage = isAppArea || isAdminArea || isContentArea || isJacksonArea || studentOnlyPage;
  const protectedApi = isFinanceApi || isAdminApi || studentOnlyApi;

  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[middleware] supabase.auth.getUser error:', error.message || error);
    }
    user = data?.user || null;
  } catch (error) {
    console.error('[middleware] supabase.auth.getUser fetch failed:', error);
  }

  if (!user) {
    if (protectedPage) return redirectToLogin(request);
    if (isProfileApi) return jsonError('unauthorized', 401);
    if (protectedApi && !isAuthApi) return jsonError('unauthorized', 401);
    return response;
  }

  let profile = null;
  try {
    const { data } = await supabase.from('profiles').select('role,status,turma,is_admin').eq('id', user.id).maybeSingle();
    profile = data || null;
  } catch (error) {
    console.error('[middleware] profile query failed:', error);
  }

  if (!profile) {
    if (protectedPage) return redirectToLogin(request);
    if (isProfileApi) return jsonError('forbidden', 403);
    if (protectedApi) return jsonError('forbidden', 403);
    return response;
  }

  if (pathname === ROOT_PATH && profile.status === 'active') {
    return redirect(request, getSafeNextPath(request) || (profile.role === 'admin' ? '/admin' : '/app'));
  }

  if ((protectedPage || protectedApi) && profile.status !== 'active') {
    if (isApi) return jsonError('inactive_account', 403);
    return redirectToLogin(request);
  }

  if (isAdminArea && profile.role !== 'admin') {
    return redirect(request, '/app');
  }

  if (isAdminApi && profile.role !== 'admin') {
    return jsonError('forbidden', 403);
  }

  if (isAppArea && profile.role === 'admin') {
    return redirect(request, '/admin');
  }

  if (profile.role !== 'admin' && studentOnlyPage && !hasStudentAccess(profile)) {
    return redirect(request, '/app');
  }

  if (profile.role !== 'admin' && studentOnlyApi && !hasStudentAccess(profile)) {
    return jsonError('student_access_required', 403);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
};
