export async function getCurrentProfile(supabase) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,phone,status,role,tier,is_admin,created_at,approved_at,approved_by')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) return { user, profile: null };
  return { user, profile };
}
