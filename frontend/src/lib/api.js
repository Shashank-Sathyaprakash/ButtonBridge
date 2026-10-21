// Talks to the local Python agent at http://127.0.0.1:8765.
// Falls back to localStorage when the agent is unreachable (e.g. the
// IIS-hosted page is open but server.py isn't running yet), so the
// configurator stays usable offline and syncs the moment the agent
// comes back.

const AGENT_BASE = "http://127.0.0.1:8765";
const LS_KEY = "mxRemapperConfig";
const LS_PROFILES_KEY = "mxRemapperProfiles";

export const DEFAULT_PROFILE = {
  middleClick: { type: "preset", id: "task_view" },
  modeShift: { type: "none" },
  thumbLeft: { type: "preset", id: "desktop_left" },
  thumbRight: { type: "preset", id: "desktop_right" },
  forward: { type: "preset", id: "browser_tab_next" },
  back: { type: "preset", id: "browser_tab_prev" },
  gestureTap: { type: "none" },
  gestureUp: { type: "none" },
  gestureDown: { type: "none" },
  gestureLeft: { type: "none" },
  gestureRight: { type: "none" },
  gestureThresholdPx: 40,
};

export const DEFAULT_CONFIG = {
  activeProfile: "Default OS",
  profiles: { "Default OS": DEFAULT_PROFILE },
};

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : structuredClone(DEFAULT_CONFIG);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

function writeLocal(config) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    // storage unavailable/full — config still lives in memory for this session
  }
}

async function withTimeout(promise, ms = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function pingAgent() {
  try {
    const res = await withTimeout((signal) =>
      fetch(`${AGENT_BASE}/health`, { signal })
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchConfig() {
  try {
    const res = await withTimeout((signal) =>
      fetch(`${AGENT_BASE}/config`, { signal })
    );
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    writeLocal(data); // keep local mirror in sync
    return { config: data, online: true };
  } catch {
    return { config: readLocal(), online: false };
  }
}

export async function saveConfig(config) {
  writeLocal(config);
  try {
    const res = await withTimeout((signal) =>
      fetch(`${AGENT_BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        signal,
      })
    );
    return res.ok;
  } catch {
    return false; // saved locally; will not be live until the agent is back
  }
}

export async function fetchEvents(sinceTs = 0) {
  try {
    const res = await withTimeout((signal) =>
      fetch(`${AGENT_BASE}/events?since=${sinceTs}`, { signal })
    );
    if (!res.ok) throw new Error("bad status");
    return await res.json();
  } catch {
    return { events: [], serverTime: sinceTs };
  }
}

export async function triggerTest(inputId) {
  try {
    const res = await withTimeout((signal) =>
      fetch(`${AGENT_BASE}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputId }),
        signal,
      })
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function loadStoredProfilesList() {
  try {
    const raw = localStorage.getItem(LS_PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredProfilesList(list) {
  try {
    localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
