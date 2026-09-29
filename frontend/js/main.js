// main.js — GitInsight Router, Event Handling & Main Controller

import { store, subscribe } from './store.js';
import { githubAPI } from './github.js';
import { analyzer } from './analyzer.js';
import * as ui from './ui.js';
import { exportPDF, exportJSON } from './export.js';

// ─── App Init ─────────────────────────────────────────────────────────────────

async function initApp() {
  applyTheme(store.theme);

  // Validate existing auth session if present
  await validateExistingSession();

  // Render initial profile widget
  refreshProfileWidget();

  // Render current view
  renderCurrentView();
  await loadHistory();

  // Subscribe to state changes
  subscribe((key, val) => {
    if (key === 'theme') applyTheme(val);
    if (key === 'loadingStep' || key === 'loadingProgress') ui.updateLoadingUI();
    if (key === 'user') refreshProfileWidget();
  });
}

// ─── Session Validation ───────────────────────────────────────────────────────

async function validateExistingSession() {
  const token = store.authToken;
  if (!token) return;

  try {
    const response = await fetch(`${store.backendUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (response.ok) {
      const userData = await response.json();
      store.user = userData;
    } else {
      store.authToken = '';
      store.user = null;
      ui.showNotification('Session expired. Please sign in again.', 'warning');
    }
  } catch (_) {
    // Fallback to guest mode gracefully
  }
}

function refreshProfileWidget() {
  ui.renderUserProfileWidget(
    store.user,
    () => ui.showAuthModal('login'),
    handleLogout
  );
}

// ─── Theme Management ─────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  document.body.classList.toggle('dark-mode', theme === 'dark');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.querySelector('span').textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function toggleTheme() {
  store.theme = store.theme === 'dark' ? 'light' : 'dark';
  applyTheme(store.theme);
  ui.showNotification(`Switched to ${store.theme} mode`, 'info');
}

// ─── View Routing (Home, Discover, Compare, Saved, Reports, History) ──────────

function updateBreadcrumb(title) {
  const bc = document.getElementById('topBreadcrumb');
  if (bc) bc.textContent = `GitInsight / ${title}`;
}

function setActiveNavLink(id) {
  document.querySelectorAll('.sidebar-menu .menu-link').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById(id)?.classList.add('active');
}

function renderCurrentView() {
  switch (store.currentView) {
    case 'home':
      updateBreadcrumb('Home');
      setActiveNavLink('navHome');
      ui.renderHomePage();
      setupHomeEvents();
      break;

    case 'discover':
      updateBreadcrumb('Discover');
      setActiveNavLink('navDiscover');
      ui.renderDiscoverPage();
      break;

    case 'compare':
      updateBreadcrumb('Compare');
      setActiveNavLink('navCompare');
      ui.renderComparePage();
      break;

    case 'saved':
      updateBreadcrumb('Saved');
      setActiveNavLink('navSaved');
      ui.renderSavedPage();
      break;

    case 'reports':
      updateBreadcrumb('Reports');
      setActiveNavLink('navReports');
      ui.renderReportsPage();
      break;

    case 'history':
      updateBreadcrumb('Search History');
      setActiveNavLink('historyBtn');
      ui.renderHistoryPage(store.searchHistory || []);
      setupHistoryEvents();
      break;

    case 'loading':
      updateBreadcrumb('Analyzing');
      ui.renderLoadingState();
      break;

    case 'repo':
      if (store.currentAnalysis) {
        updateBreadcrumb(store.currentAnalysis.repo?.name || 'Repository');
        setActiveNavLink('navHome');
        ui.renderAnalysisDashboard(store.currentAnalysis);
        setupDashboardEvents();
      }
      break;

    case 'topic':
      if (store.currentAnalysis) {
        updateBreadcrumb(store.currentAnalysis.topic || 'Topic');
        setActiveNavLink('navHome');
        ui.renderTopicDashboard(store.currentAnalysis);
        setupDashboardEvents();
      }
      break;

    default:
      updateBreadcrumb('Home');
      setActiveNavLink('navHome');
      ui.renderHomePage();
      setupHomeEvents();
  }

  if (window.lucide) window.lucide.createIcons();
}

// ─── Global Navigation & Modal Event Handlers ────────────────────────────────

function setupGlobalEvents() {
  // Theme toggles
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Settings
  document.getElementById('settingsBtn')?.addEventListener('click', ui.showSettingsModal);
  document.getElementById('closeSettings')?.addEventListener('click', ui.hideSettingsModal);
  document.getElementById('cancelSettings')?.addEventListener('click', ui.hideSettingsModal);
  document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') ui.hideSettingsModal();
  });

  document.getElementById('saveSettings')?.addEventListener('click', () => {
    const token      = document.getElementById('githubTokenInput')?.value?.trim() || '';
    const geminiKey  = document.getElementById('geminiKeyInput')?.value?.trim() || '';
    const backendUrl = document.getElementById('backendUrlInput')?.value?.trim() || 'http://localhost:8000';

    store.githubToken  = token;
    store.geminiApiKey = geminiKey;
    store.backendUrl   = backendUrl;

    if (githubAPI.setToken) githubAPI.setToken(token);

    ui.hideSettingsModal();
    ui.showNotification('Settings saved!', 'success');
  });

  // Sidebar 6-item Nav Destinations
  document.getElementById('navHome')?.addEventListener('click', () => {
    store.currentView = 'home';
    store.currentAnalysis = null;
    renderCurrentView();
  });

  document.getElementById('navDiscover')?.addEventListener('click', () => {
    store.currentView = 'discover';
    renderCurrentView();
  });

  document.getElementById('navCompare')?.addEventListener('click', () => {
    store.currentView = 'compare';
    renderCurrentView();
  });

  document.getElementById('navSaved')?.addEventListener('click', () => {
    store.currentView = 'saved';
    renderCurrentView();
  });

  document.getElementById('navReports')?.addEventListener('click', () => {
    store.currentView = 'reports';
    renderCurrentView();
  });

  document.getElementById('historyBtn')?.addEventListener('click', () => {
    store.currentView = 'history';
    renderCurrentView();
  });

  // Auth Modal
  document.getElementById('closeAuth')?.addEventListener('click', ui.hideAuthModal);
  document.getElementById('cancelAuth')?.addEventListener('click', ui.hideAuthModal);
  document.getElementById('authModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'authModal') ui.hideAuthModal();
  });

  document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    ui.showAuthModal('register');
  });

  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    ui.showAuthModal('login');
  });

  document.getElementById('submitAuthBtn')?.addEventListener('click', handleAuthSubmit);
}

// ─── Auth Handlers ────────────────────────────────────────────────────────────

async function handleAuthSubmit() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  const mode = modal.dataset.mode || 'login';
  const submitBtn = document.getElementById('submitAuthBtn');

  let username, password;
  if (mode === 'login') {
    username = document.getElementById('loginUsername')?.value?.trim();
    password = document.getElementById('loginPassword')?.value;
  } else {
    username = document.getElementById('registerUsername')?.value?.trim();
    password = document.getElementById('registerPassword')?.value;
  }

  if (!username || !password) {
    ui.showNotification('Please fill in all fields.', 'warning');
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; }

  try {
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const response = await fetch(`${store.backendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      ui.showNotification(data.detail || 'Authentication failed.', 'error');
      return;
    }

    if (mode === 'login') {
      store.authToken = data.token;
      store.user      = data.user;
      ui.hideAuthModal();
      ui.showNotification(`Welcome back, ${data.user.username}!`, 'success');
    } else {
      ui.showNotification(`Account created for ${data.username}. Signing in…`, 'info');
      await autoLoginAfterRegister(username, password);
    }

    await loadHistory();
  } catch (err) {
    ui.showNotification('Connection error. Ensure backend is running.', 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; }
  }
}

async function autoLoginAfterRegister(username, password) {
  try {
    const response = await fetch(`${store.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const data = await response.json();
      store.authToken = data.token;
      store.user      = data.user;
      ui.hideAuthModal();
      ui.showNotification(`Welcome, ${data.user.username}!`, 'success');
    }
  } catch (_) {}
}

async function handleLogout() {
  const token = store.authToken;
  store.authToken = '';
  store.user      = null;
  store.searchHistory = [];

  ui.showNotification('Signed out successfully.', 'info');

  if (token) {
    try {
      await fetch(`${store.backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (_) {}
  }

  await loadHistory();
}

// ─── Home Search Pipeline ─────────────────────────────────────────────────────

function setupHomeEvents() {
  const analyzeBtn  = document.getElementById('analyzeBtn');
  const searchInput = document.getElementById('searchInput');

  analyzeBtn?.addEventListener('click', handleSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

// ─── Search Execution ─────────────────────────────────────────────────────────

async function handleSearch() {
  const input = document.getElementById('searchInput');
  const query = input?.value?.trim();
  if (!query) {
    ui.showNotification('Please enter a GitHub repository URL or topic.', 'warning');
    input?.focus();
    return;
  }

  const isRepoUrl = /github\.com\//.test(query) || /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(query);
  const mode = store.searchMode === 'topic' ? 'topic' : (isRepoUrl ? 'repo' : 'topic');

  try {
    store.currentView = 'loading';
    ui.renderLoadingState();

    let analysis;
    if (mode === 'repo') {
      analysis = await analyzer.analyzeRepo(query);
      store.currentAnalysis = analysis;
      store.currentView = 'repo';
      ui.renderAnalysisDashboard(analysis);
      setupDashboardEvents();
    } else {
      analysis = await analyzer.analyzeTopic(query);
      store.currentAnalysis = analysis;
      store.currentView = 'topic';
      ui.renderTopicDashboard(analysis);
      setupDashboardEvents();
    }

    await loadHistory();
    ui.showNotification('Analysis complete!', 'success');
  } catch (err) {
    console.error('Analysis failed:', err);
    store.currentView = 'error';
    ui.renderError(err.message || 'An unexpected error occurred during analysis.');
  }

  if (window.lucide) window.lucide.createIcons();
}

// ─── Dashboard Action Handlers ────────────────────────────────────────────────

function setupDashboardEvents() {
  document.getElementById('exportPDFBtn')?.addEventListener('click', async () => {
    if (!store.currentAnalysis) return;
    ui.showNotification('Generating PDF report…', 'info');
    try {
      await exportPDF(store.currentAnalysis);
      ui.showNotification('PDF exported successfully!', 'success');
    } catch (e) {
      ui.showNotification('PDF export failed: ' + e.message, 'error');
    }
  });

  document.getElementById('exportJSONBtn')?.addEventListener('click', () => {
    if (!store.currentAnalysis) return;
    exportJSON(store.currentAnalysis);
    ui.showNotification('JSON report downloaded!', 'success');
  });

  document.getElementById('saveReportBtn')?.addEventListener('click', handleSaveReport);
}

async function handleSaveReport() {
  if (!store.currentAnalysis) return;

  const analysis = store.currentAnalysis;
  const title = analysis.repo_name
    ? `${analysis.owner}/${analysis.repo_name}`
    : `${analysis.topic || 'Topic'} Report`;

  // Local storage bookmarks
  const saved = JSON.parse(localStorage.getItem('gitinsight_saved') || '[]');
  saved.push({ title, repo_url: analysis.html_url, created_at: new Date().toISOString() });
  localStorage.setItem('gitinsight_saved', JSON.stringify(saved));

  // Also persist to backend
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (store.authToken) headers['Authorization'] = `Bearer ${store.authToken}`;

    await fetch(`${store.backendUrl}/api/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        repo_url:    analysis.html_url || null,
        topic:       analysis.topic    || null,
        report_data: analysis,
      }),
    });
  } catch (_) {}

  ui.showNotification('Report saved to bookmarks!', 'success');
}

// ─── History & Error Handlers ─────────────────────────────────────────────────

function setupHistoryEvents() {
  document.getElementById('clearHistoryBtn')?.addEventListener('click', async () => {
    if (!confirm('Clear search history?')) return;
    store.searchHistory = [];
    try {
      const headers = {};
      if (store.authToken) headers['Authorization'] = `Bearer ${store.authToken}`;
      await fetch(`${store.backendUrl}/api/history`, { method: 'DELETE', headers });
    } catch (_) {}
    ui.renderHistoryPage([]);
    ui.showNotification('Search history cleared.', 'info');
  });
}

async function loadHistory() {
  try {
    const headers = {};
    if (store.authToken) headers['Authorization'] = `Bearer ${store.authToken}`;
    const response = await fetch(`${store.backendUrl}/api/history`, { headers });
    if (response.ok) {
      const history = await response.json();
      store.searchHistory = history;
    }
  } catch (_) {}
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

window.storeState = store;

document.addEventListener('DOMContentLoaded', async () => {
  setupGlobalEvents();
  await initApp();
});
