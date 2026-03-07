'use client';
import { useState } from 'react';
import { usePresenceStore } from '@/lib/hooks/use-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
type Tab = 'join' | 'space' | 'ping' | 'stats';
const STATUSES = ['online', 'away', 'busy', 'invisible'];
const PRIVACY = [{ l: 0, n: 'Public' }, { l: 1, n: 'Friends' }, { l: 2, n: 'Minimal' }, { l: 3, n: 'ZKP-only' }];

export default function ConsolePage() {
  const [tab, setTab] = useState<Tab>('join');
  const { sessionId, setSessionId, spaceId, setSpaceId, userId, setUserId, displayName, setDisplayName, result, setResult, loading, setLoading } = usePresenceStore();
  const [status, setStatus] = useState('online');
  const [privacy, setPrivacy] = useState(0);
  const [radius, setRadius] = useState('50');

  const doFetch = async (path: string, body: unknown) => {
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'demo' }, body: JSON.stringify(body) });
      const data = await r.json();
      setResult(data);
      if (data.session_id && !sessionId) setSessionId(data.session_id);
    } catch (e) { setResult({ error: (e as Error).message }); } finally { setLoading(false); }
  };

  const doGet = async (path: string) => {
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API}${path}`, { headers: { 'X-API-Key': 'demo' } });
      setResult(await r.json());
    } catch (e) { setResult({ error: (e as Error).message }); } finally { setLoading(false); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'join', label: 'Join / Update' },
    { key: 'space', label: 'Space View' },
    { key: 'ping', label: 'Proximity Ping' },
    { key: 'stats', label: 'Stats' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Presence Console</h1>
      {sessionId && <p className="text-xs text-muted-foreground font-mono">Session: {sessionId}</p>}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'join' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">User ID</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user-123" className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Space ID</label>
              <input value={spaceId} onChange={(e) => setSpaceId(e.target.value)} placeholder="lobby" className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Display Name</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alice" className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => doFetch('/api/v1/presence/join', { user_id: userId || `user-${Date.now()}`, space_id: spaceId, display_name: displayName || undefined })}
              disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Joining...' : 'Join Space'}
            </button>
            <button onClick={() => doFetch('/api/v1/presence/leave', { session_id: sessionId })}
              disabled={loading || !sessionId} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              Leave
            </button>
          </div>

          {sessionId && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold">Update Status</h3>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${status === s ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>{s}</button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {PRIVACY.map((p) => (
                  <button key={p.l} onClick={() => setPrivacy(p.l)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${privacy === p.l ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>{p.n}</button>
                ))}
              </div>
              <button onClick={() => doFetch('/api/v1/presence/update', { session_id: sessionId, status, privacy_level: privacy })}
                disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Update
              </button>
            </div>
          )}

          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {result.session_id != null && (<Stat label="Session" value={String(result.session_id).slice(0, 8)} />)}
                {result.status != null && (<Stat label="Status" value={String(result.status)} accent />)}
                {result.online_count != null && (<Stat label="Online" value={String(result.online_count)} />)}
                {result.zkp_token != null && (<Stat label="ZKP Token" value={String(result.zkp_token).slice(0, 12) + '...'} />)}
                {result.vivaldi_coordinates != null && (<Stat label="Vivaldi" value={(result.vivaldi_coordinates as number[]).map(v => Number(v).toFixed(3)).join(', ')} />)}
                {result.privacy_level != null && (<Stat label="Privacy" value={PRIVACY.find(p => p.l === result.privacy_level)?.n ?? String(result.privacy_level)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'space' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={spaceId} onChange={(e) => setSpaceId(e.target.value)} placeholder="Space ID"
              className="px-3 py-2 border border-input rounded-md bg-background text-sm flex-1 max-w-xs" />
            <button onClick={() => doGet(`/api/v1/presence/space/${spaceId}`)}
              disabled={loading || !spaceId} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Loading...' : 'View Space'}
            </button>
          </div>
          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex gap-4 items-center">
                <Stat label="Space" value={String(result.space_id ?? spaceId)} />
                <Stat label="Online" value={String(result.online_count ?? 0)} accent />
              </div>
              {Array.isArray(result.users) && (result.users as Array<Record<string, unknown>>).length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-1 pr-4">User</th><th className="py-1 pr-4">Status</th><th className="py-1 pr-4">Vivaldi</th><th className="py-1">Last Seen</th>
                  </tr></thead>
                  <tbody>
                    {(result.users as Array<Record<string, unknown>>).map((u, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1 pr-4">{String(u.display_name || u.user_id)}</td>
                        <td className="py-1 pr-4"><StatusBadge status={String(u.status)} /></td>
                        <td className="py-1 pr-4 text-xs font-mono text-muted-foreground">{Array.isArray(u.vivaldi_coordinates) ? (u.vivaldi_coordinates as number[]).map(v => Number(v).toFixed(2)).join(', ') : '-'}</td>
                        <td className="py-1 text-xs text-muted-foreground">{String(u.last_seen ?? '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'ping' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Session ID</label>
              <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Space ID</label>
              <input value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1">Radius</label>
              <input value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm" /></div>
          </div>
          <button onClick={() => doFetch('/api/v1/presence/ping', { session_id: sessionId, radius: +radius, space_id: spaceId })}
            disabled={loading || !sessionId} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Pinging...' : 'Proximity Ping'}
          </button>
          {result && !('error' in result) && (
            <div className="border border-border rounded-lg p-4">
              <Stat label="Nearby Users" value={String(result.count ?? 0)} accent />
              {Array.isArray(result.nearby) && (result.nearby as Array<Record<string, unknown>>).map((u, i) => (
                <div key={i} className="flex gap-4 mt-2 text-sm">
                  <span>{String(u.user_id)}</span>
                  <span className="text-muted-foreground">dist: {Number(u.distance).toFixed(2)}</span>
                  <StatusBadge status={String(u.status)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-4">
          <button onClick={() => doGet('/api/v1/presence/stats')} disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Load Stats'}
          </button>
          {result && !('error' in result) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(result).map(([k, v]) => <Stat key={k} label={k.replace(/_/g, ' ')} value={String(v)} />)}
            </div>
          )}
        </div>
      )}

      {result && 'error' in result && <p className="text-sm text-red-500">{String(result.error)}</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 py-2 bg-muted rounded-md">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${accent ? 'text-blue-400' : ''}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { online: 'bg-green-500', away: 'bg-yellow-500', busy: 'bg-red-500', invisible: 'bg-gray-500' };
  return <span className={`inline-flex items-center gap-1 text-xs`}><span className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-gray-500'}`} />{status}</span>;
}
