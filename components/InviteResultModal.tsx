import React from 'react';
import Card from './ui/Card';

type Props = {
  isOpen: boolean;
  title: string;
  message?: string;
  email?: string;
  role?: string;
  code?: string;
  onClose: () => void;
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#0B0F14]/55">{label}</div>
    <div className={mono ? 'mt-1 font-black tracking-wider text-[#0B0F14]' : 'mt-1 font-bold text-[#0B0F14]'}>
      {value}
    </div>
  </div>
);

export default function InviteResultModal({ isOpen, title, message, email, role, code, onClose }: Props) {
  if (!isOpen) return null;

  const canCopy = Boolean(code);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      // lightweight feedback without browser alert
      const el = document.getElementById('invite-copied');
      if (el) {
        el.textContent = 'Copied';
        setTimeout(() => {
          el.textContent = 'Copy';
        }, 1200);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
            {message ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {code ? (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {email ? <Field label="Email" value={email} /> : null}
            {role ? <Field label="Role" value={role} /> : null}
            <div className="md:col-span-2 p-4 rounded-xl bg-[#F2B233]/10 ring-1 ring-[#F2B233]/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#0B0F14]/55">Login Code</div>
                  <div className="mt-1 font-black tracking-[0.18em] text-[#0B0F14]">{code}</div>
                </div>
                <button
                  onClick={copy}
                  disabled={!canCopy}
                  className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary-ink disabled:opacity-50"
                >
                  <span id="invite-copied">Copy</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#0B0F14]/55">Next steps</div>
              <ol className="mt-2 text-sm text-gray-700 dark:text-gray-200 space-y-1 list-decimal list-inside">
                <li>Tell the agent this code.</li>
                <li>They go to Login → “Invited to the team?”</li>
                <li>Enter email + code + set password.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-4 rounded-xl bg-[#0B0F14]/5 ring-1 ring-black/5">
            <p className="text-sm text-gray-700 dark:text-gray-200">{message || 'Something went wrong.'}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-extrabold rounded-lg btn-primary-gold">
            OK
          </button>
        </div>
      </Card>
    </div>
  );
}
