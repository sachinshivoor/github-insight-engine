// Simple reactive state store using Proxy

const subscribers = new Set();

function reactive(initialState) {
  const state = { ...initialState };
  return new Proxy(state, {
    set(target, key, value) {
      target[key] = value;
      // Persist certain keys to localStorage
      if (key === 'theme') localStorage.setItem('theme', value);
      if (key === 'githubToken') localStorage.setItem('githubToken', value);
      if (key === 'geminiApiKey') localStorage.setItem('geminiApiKey', value);
      if (key === 'backendUrl') localStorage.setItem('backendUrl', value);
      if (key === 'searchHistory') localStorage.setItem('searchHistory', JSON.stringify(value));
      if (key === 'authToken') {
        if (value) localStorage.setItem('authToken', value);
        else localStorage.removeItem('authToken');
      }
      if (key === 'user') {
        if (value) localStorage.setItem('user', JSON.stringify(value));
        else localStorage.removeItem('user');
      }
      // Notify all subscribers
      subscribers.forEach(fn => fn(key, value));
      return true;
    },
    get(target, key) {
      return target[key];
    }
  });
}

export const store = reactive({
  // Analysis state
  currentAnalysis: null,
  currentView: 'home', // 'home' | 'loading' | 'repo' | 'topic' | 'history'
  isLoading: false,
  loadingStep: '',
  loadingProgress: 0,
  loadingSteps: [],
  error: null,

  // UI state
  theme: localStorage.getItem('theme') || 'dark',
  activeTab: 'overview',
  sidebarOpen: true,

  // Settings
  githubToken: localStorage.getItem('githubToken') || '',
  geminiApiKey: localStorage.getItem('geminiApiKey') || '',
  backendUrl: localStorage.getItem('backendUrl') || 'http://localhost:8000',

  // Auth State
  authToken: localStorage.getItem('authToken') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  // History
  searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
});

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function notify() {
  subscribers.forEach(fn => fn('__refresh__', null));
}
