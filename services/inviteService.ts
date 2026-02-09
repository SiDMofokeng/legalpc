import { auth } from './firebase';

export async function createInvite(params: { name: string; email: string; role: 'Admin' | 'Agent' }) {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  const token = await u.getIdToken();

  const res = await fetch('/api/invite/create', {
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
  const res = await fetch('/api/invite/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || 'Invite accept failed');
  return data as { ok: true };
}
