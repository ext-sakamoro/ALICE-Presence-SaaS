import { create } from 'zustand';

interface PresenceState {
  sessionId: string;
  spaceId: string;
  userId: string;
  displayName: string;
  result: Record<string, unknown> | null;
  loading: boolean;
  setSessionId: (v: string) => void;
  setSpaceId: (v: string) => void;
  setUserId: (v: string) => void;
  setDisplayName: (v: string) => void;
  setResult: (v: Record<string, unknown> | null) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  sessionId: '',
  spaceId: 'lobby',
  userId: '',
  displayName: '',
  result: null,
  loading: false,
  setSessionId: (sessionId) => set({ sessionId }),
  setSpaceId: (spaceId) => set({ spaceId }),
  setUserId: (userId) => set({ userId }),
  setDisplayName: (displayName) => set({ displayName }),
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ sessionId: '', spaceId: 'lobby', userId: '', displayName: '', result: null, loading: false }),
}));
