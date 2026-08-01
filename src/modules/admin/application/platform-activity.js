function profileSummary(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    full_name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    tier: profile.tier || 'DESPERTAR',
    turma: profile.turma || '',
    status: profile.status || ''
  };
}

function event({ id, category, severity = 'info', type, title, detail = '', occurredAt, profile, href = '', metadata = {}, status = 'open' }) {
  return {
    id,
    category,
    severity,
    type,
    title,
    detail,
    occurred_at: occurredAt,
    profile: profileSummary(profile),
    href,
    metadata,
    status
  };
}

function emailSeverity(status) {
  if (['failed', 'bounced'].includes(status)) return 'error';
  if (['delivered', 'opened', 'clicked'].includes(status)) return 'success';
  return 'info';
}

function diagnosticSeverity(row) {
  if (row.status === 'generation_failed' || row.email_status === 'failed' || row.pdf_status === 'failed') return 'error';
  if (row.status === 'report_ready') return 'success';
  return 'info';
}

function productSeverity(status) {
  if (['refunded', 'chargeback', 'revoked'].includes(status)) return 'warning';
  return status === 'active' ? 'success' : 'info';
}

function displayName(profile) {
  return profile?.full_name || profile?.email || 'Usuário';
}

export function buildPlatformActivity({
  profiles = [],
  profileById = new Map(),
  productAccess = [],
  diagnostics = [],
  emailLogs = [],
  feedEvents = [],
  webhookEvents = [],
  platformEvents = [],
  adminLogs = [],
  now = new Date()
}) {
  const events = [];
  const profileMap = new Map(profileById);
  profiles.forEach((profile) => profileMap.set(profile.id, profile));
  const hrefFor = (userId) => (userId ? `/admin/users/${encodeURIComponent(userId)}/dashboard` : '');

  for (const profile of profiles) {
    events.push(event({
      id: `signup:${profile.id}`,
      category: 'user',
      type: 'user.signup',
      title: 'Novo cadastro',
      detail: `${displayName(profile)} entrou no ZeroApp como ${profile.tier || 'DESPERTAR'}.`,
      occurredAt: profile.created_at,
      profile,
      href: hrefFor(profile.id),
      status: 'resolved'
    }));
  }

  for (const access of productAccess) {
    const profile = profileMap.get(access.user_id);
    const active = access.status === 'active';
    events.push(event({
      id: `access:${access.id}`,
      category: 'commerce',
      severity: productSeverity(access.status),
      type: `commerce.${access.status}`,
      title: active ? 'Compra e acesso confirmados' : `Acesso ${access.status}`,
      detail: `${displayName(profile)} · ${access.product_code || 'produto'} · origem ${access.source || 'não informada'}.`,
      occurredAt: active ? access.granted_at || access.created_at : access.revoked_at || access.updated_at || access.created_at,
      profile,
      href: hrefFor(access.user_id),
      metadata: { purchase_id: access.purchase_id, product_code: access.product_code },
      status: active ? 'resolved' : 'open'
    }));
  }

  for (const diagnostic of diagnostics) {
    const profile = profileMap.get(diagnostic.user_id);
    const labels = {
      not_started: 'Diagnóstico ainda não iniciado',
      in_progress: 'Diagnóstico em andamento',
      answers_completed: 'Respostas do diagnóstico concluídas',
      generating_report: 'Relatório em geração',
      report_ready: 'Relatório do diagnóstico pronto',
      generation_failed: 'Falha ao gerar relatório'
    };
    const severity = diagnosticSeverity(diagnostic);
    events.push(event({
      id: `diagnostic:${diagnostic.id}`,
      category: 'diagnostic',
      severity,
      type: `diagnostic.${diagnostic.status}`,
      title: labels[diagnostic.status] || 'Diagnóstico atualizado',
      detail: `${displayName(profile)}${diagnostic.last_error ? ` · ${diagnostic.last_error}` : ''}`,
      occurredAt: diagnostic.updated_at || diagnostic.created_at,
      profile,
      href: hrefFor(diagnostic.user_id),
      metadata: { diagnostic_id: diagnostic.id, email_status: diagnostic.email_status, pdf_status: diagnostic.pdf_status },
      status: severity === 'error' ? 'open' : 'resolved'
    }));
  }

  for (const log of emailLogs) {
    const profile = profileMap.get(log.user_id);
    const severity = emailSeverity(log.status);
    events.push(event({
      id: `email:${log.id}`,
      category: 'email',
      severity,
      type: `email.${log.status}`,
      title: severity === 'error' ? 'Falha na entrega de e-mail' : 'E-mail enviado',
      detail: `${log.subject || log.email_type} · ${log.recipient || profile?.email || 'destinatário não informado'}`,
      occurredAt: log.last_event_at || log.created_at || log.sent_at,
      profile,
      href: `/admin/emails${log.recipient ? `?search=${encodeURIComponent(log.recipient)}` : ''}`,
      metadata: { email_type: log.email_type, status: log.status },
      status: severity === 'error' ? 'open' : 'resolved'
    }));
  }

  for (const movement of feedEvents) {
    const profile = profileMap.get(movement.user_id);
    events.push(event({
      id: `movement:${movement.id}`,
      category: 'user',
      severity: 'success',
      type: `movement.${movement.event_type}`,
      title: 'Movimentação na plataforma',
      detail: `${displayName(profile)} · ${movement.title || movement.event_type}`,
      occurredAt: movement.created_at,
      profile,
      href: hrefFor(movement.user_id),
      metadata: { event_type: movement.event_type },
      status: 'resolved'
    }));
  }

  for (const webhook of webhookEvents) {
    const severity = webhook.status === 'failed' ? 'error' : webhook.status === 'processing' ? 'warning' : 'success';
    events.push(event({
      id: `webhook:${webhook.id}`,
      category: 'commerce',
      severity,
      type: `webhook.${webhook.status}`,
      title: severity === 'error' ? 'Falha no webhook de compra' : 'Webhook de compra processado',
      detail: `${webhook.provider || 'provedor'} · ${webhook.product_code || webhook.event_type || 'evento'}${webhook.last_error ? ` · ${webhook.last_error}` : ''}`,
      occurredAt: webhook.updated_at || webhook.created_at,
      metadata: { purchase_id: webhook.purchase_id, attempts: webhook.attempts },
      status: severity === 'error' ? 'open' : 'resolved'
    }));
  }

  for (const row of platformEvents) {
    const profile = profileMap.get(row.user_id);
    events.push(event({
      id: `platform:${row.id}`,
      category: row.category,
      severity: row.severity,
      type: row.event_type,
      title: row.title,
      detail: row.message || '',
      occurredAt: row.occurred_at || row.created_at,
      profile,
      href: hrefFor(row.user_id),
      metadata: row.metadata || {},
      status: row.status
    }));
  }

  for (const row of adminLogs) {
    const profile = profileMap.get(row.target_user_id);
    events.push(event({
      id: `admin:${row.id}`,
      category: 'admin',
      type: `admin.${row.action}`,
      title: 'Ação administrativa',
      detail: `${row.action} em ${row.resource}${profile ? ` · ${displayName(profile)}` : ''}`,
      occurredAt: row.created_at,
      profile,
      href: hrefFor(row.target_user_id),
      metadata: row.metadata || {},
      status: 'resolved'
    }));
  }

  events.sort((a, b) => new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0));

  const accessByUser = new Map();
  productAccess.forEach((access) => {
    const list = accessByUser.get(access.user_id) || [];
    list.push(access);
    accessByUser.set(access.user_id, list);
  });
  const diagnosticByUser = new Map(diagnostics.map((row) => [row.user_id, row]));
  const attention = events.filter((item) => item.status === 'open' && ['error', 'warning'].includes(item.severity));

  for (const profile of profiles) {
    if (profile.role === 'admin') continue;
    const activePurchases = (accessByUser.get(profile.id) || []).filter((access) => access.status === 'active');
    if (String(profile.tier || 'DESPERTAR').toUpperCase() === 'DESPERTAR' && activePurchases.length === 0) {
      attention.push(event({
        id: `opportunity:${profile.id}`,
        category: 'user',
        severity: 'info',
        type: 'user.commercial_followup',
        title: 'Novo usuário para acompanhamento',
        detail: `${displayName(profile)} se cadastrou e ainda não possui compra registrada. Avalie contato, suporte inicial ou oportunidade de mentoria.`,
        occurredAt: profile.created_at,
        profile,
        href: hrefFor(profile.id)
      }));
    }

    const diagnostic = diagnosticByUser.get(profile.id);
    const diagnosticPurchase = activePurchases.find((access) => access.product_code === 'diagnostico_completo');
    if (diagnosticPurchase && (!diagnostic || diagnostic.status === 'not_started')) {
      attention.push(event({
        id: `onboarding:${diagnostic?.id || diagnosticPurchase.id}`,
        category: 'diagnostic',
        severity: 'warning',
        type: 'diagnostic.onboarding_pending',
        title: 'Comprou o Diagnóstico, mas ainda não começou',
        detail: `${displayName(profile)} pode precisar de ajuda com acesso ou primeiros passos.`,
        occurredAt: diagnostic?.created_at || diagnosticPurchase.granted_at || diagnosticPurchase.created_at,
        profile,
        href: hrefFor(profile.id)
      }));
    }
  }

  const cutoff = new Date(now).getTime() - 48 * 60 * 60 * 1000;
  for (const diagnostic of diagnostics) {
    if (diagnostic.status !== 'in_progress' || new Date(diagnostic.updated_at).getTime() >= cutoff) continue;
    const profile = profileMap.get(diagnostic.user_id);
    attention.push(event({
      id: `stalled:${diagnostic.id}`,
      category: 'diagnostic',
      severity: 'warning',
      type: 'diagnostic.stalled',
      title: 'Diagnóstico parado há mais de 48 horas',
      detail: `${displayName(profile)} iniciou, mas pode precisar de um lembrete ou suporte.`,
      occurredAt: diagnostic.updated_at,
      profile,
      href: hrefFor(diagnostic.user_id)
    }));
  }

  attention.sort((a, b) => {
    const weight = { error: 3, warning: 2, info: 1 };
    return (weight[b.severity] || 0) - (weight[a.severity] || 0) || new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0);
  });

  return {
    metrics: {
      new_users: profiles.filter((profile) => profile.role !== 'admin').length,
      purchases: productAccess.filter((access) => access.status === 'active').length,
      diagnostics_ready: diagnostics.filter((row) => row.status === 'report_ready').length,
      platform_movements: feedEvents.length,
      email_failures: emailLogs.filter((log) => ['failed', 'bounced'].includes(log.status)).length,
      open_attention: attention.length,
      critical_errors: attention.filter((item) => item.severity === 'error').length
    },
    attention: attention.slice(0, 50),
    events: events.slice(0, 200)
  };
}
