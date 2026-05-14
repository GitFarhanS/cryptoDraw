import type { Edge, Node } from '@xyflow/react';

export type FlowViewport = { x: number; y: number; zoom: number };

export type PersistedBoard = {
  nodes: Node[];
  edges: Edge[];
  viewport: FlowViewport;
};

const CONSENT_COOKIE = 'cryptoDrawer_functional_v1';
const BOARD_KEY = 'cryptoDrawer_board_v1';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export type FunctionalConsent = 'unknown' | 'granted' | 'denied';

export function readFunctionalConsent(): FunctionalConsent {
  if (typeof document === 'undefined') return 'unknown';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  );
  const raw = match?.[1] ? decodeURIComponent(match[1]) : '';
  if (raw === '1') return 'granted';
  if (raw === '0') return 'denied';
  return 'unknown';
}

export function setFunctionalConsentCookie(granted: boolean) {
  const value = granted ? '1' : '0';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function loadPersistedBoard(): PersistedBoard | null {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedBoard;
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    const v = parsed.viewport;
    if (!v || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.zoom !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedBoard(flow: PersistedBoard) {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(flow));
  } catch {
    /* quota or private mode */
  }
}

export function clearPersistedBoard() {
  try {
    localStorage.removeItem(BOARD_KEY);
  } catch {
    /* ignore */
  }
}
