import { auth } from './firebase';

function apiBase(): string {
  // In production, Hosting serves the SPA and functions on the same origin.
  // In dev (localhost Vite), /api/* would hit Vite and 404 unless proxied.
  // So we default to the deployed Hosting URL when running on localhost.
  const envBase = (import.meta as any)?.env?.VITE_API_BASE;
  if (typeof envBase === 'string' && envBase.trim()) return envBase.trim().replace(/\/$/, '');

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'https://legal-practice-council-agents.web.app';
  }
  return '';
}

export async function createInvite(params: { name: string; email: string; role: 'Admin' | 'Agent' }) {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  const token = await u.getIdToken();

  const base = apiBase();
  const res = await fetch(`${base}/api/invite/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || 'Invite create failed');
  return data as { ok: true; inviteId: string; code: string };
}

export async function acceptInvite(params: { email: string; code: string; password: string }) {
  const base = apiBase();
  const res = await fetch(`${base}/api/invite/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || 'Invite accept failed');
  return data as { ok: true };
}
