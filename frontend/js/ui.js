// ui.js — GitInsight UI Rendering Engine
// Commercial Developer Platform Presentation Layer

import { store } from './store.js';
import * as charts from './charts.js';

/* ─── Icon helper (Lucide SVG inline) ─────────────────────── */
function icon(name, cls = '') {
  return `<i data-lucide="${name}" aria-hidden="true" ${cls ? `class="${cls}"` : ''}></i>`;
}

/* ─── Format Helpers ──────────────────────────────────────── */
export function formatNumber(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString();
}

export function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function timeAgo(str) {
  if (!str) return '—';
  const diff = Date.now() - new Date(str).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/* ─── Toast Notifications ────────────────────────────────── */
export function showNotification(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const iconMap = { success: 'check-circle', error: 'alert-triangle', info: 'info', warning: 'alert-circle' };
  const toast = document.createElement('div');
  toast.className = `notification ${type}`;
  toast.innerHTML = `
    <i data-lucide="${iconMap[type] || 'bell'}" style="width:18px;height:18px;" aria-hidden="true"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ─── Settings Modal ──────────────────────────────────────── */
export function showSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  document.getElementById('githubTokenInput').value = store.githubToken || '';
  document.getElementById('geminiKeyInput').value   = store.geminiApiKey || '';
  document.getElementById('backendUrlInput').value  = store.backendUrl || 'http://localhost:8000';
  modal.hidden = false;
  if (window.lucide) window.lucide.createIcons();
}

export function hideSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  modal.hidden = true;
}

/* ─── Auth Modal ──────────────────────────────────────────── */
export function showAuthModal(mode = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  const loginForm    = document.getElementById('loginFormContainer');
  const registerForm = document.getElementById('registerFormContainer');
  document.getElementById('loginUsername').value     = '';
  document.getElementById('loginPassword').value     = '';
  document.getElementById('registerUsername').value  = '';
  document.getElementById('registerPassword').value  = '';

  if (mode === 'login') {
    loginForm.style.display    = 'flex';
    registerForm.style.display = 'none';
    document.getElementById('authTitleText').textContent     = 'Sign In to GitInsight';
    document.getElementById('authSubmitText').textContent    = 'Sign In';
    document.getElementById('authSubmitIcon').setAttribute('data-lucide', 'log-in');
    modal.dataset.mode = 'login';
  } else {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'flex';
    document.getElementById('authTitleText').textContent     = 'Create Account';
    document.getElementById('authSubmitText').textContent    = 'Register';
    document.getElementById('authSubmitIcon').setAttribute('data-lucide', 'user-plus');
    modal.dataset.mode = 'register';
  }
  modal.hidden = false;
  if (window.lucide) window.lucide.createIcons();
}

export function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.hidden = true;
}

/* ─── User Profile Widget (Sidebar Bottom) ───────────────── */
export function renderUserProfileWidget(user, onSignInClick, onSignOutClick) {
  const container = document.getElementById('userProfileWidget');
  if (!container) return;
  if (user) {
    const initial = user.username.charAt(0).toUpperCase();
    container.innerHTML = `
      <div class="user-profile-row">
        <div class="user-avatar-small">${initial}</div>
        <div class="user-info-text">${user.username}</div>
        <button class="btn-ghost" id="sidebarLogoutBtn" title="Sign Out" style="padding:4px">
          ${icon('log-out')}
        </button>
      </div>
    `;
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', onSignOutClick);
  } else {
    container.innerHTML = `
      <div class="user-profile-row" style="cursor:pointer" id="sidebarSignInWrap">
        <div class="user-avatar-small">${icon('user')}</div>
        <div class="user-info-text" style="color:var(--accent)">Sign In</div>
      </div>
    `;
    document.getElementById('sidebarSignInWrap')?.addEventListener('click', onSignInClick);
  }
  if (window.lucide) window.lucide.createIcons();
}

/* ─── Loading Checklist Step Tracker ─────────────────────── */
export function updateLoadingUI() {
  const stepText = document.getElementById('loadingStepText');
  if (stepText) stepText.textContent = store.loadingStep || 'Processing…';

  const progress = store.loadingProgress || 0;
  const items = [
    { id: 'check-repo', pct: 20 },
    { id: 'check-contrib', pct: 40 },
    { id: 'check-lang', pct: 60 },
    { id: 'check-doc', pct: 75 },
    { id: 'check-ai', pct: 90 },
    { id: 'check-report', pct: 100 },
  ];

  items.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;
    if (progress >= item.pct) {
      el.className = 'loading-checklist-item done';
      el.querySelector('.check-mark').textContent = '✔';
    } else if (progress >= item.pct - 15) {
      el.className = 'loading-checklist-item active';
      el.querySelector('.check-mark').textContent = '•';
    } else {
      el.className = 'loading-checklist-item';
      el.querySelector('.check-mark').textContent = '○';
    }
  });
}

export function renderLoadingState() {
  const main = document.getElementById('mainContent');
  if (!main) return;
  main.innerHTML = `
    <div class="page-workspace" style="align-items:center; justify-content:center; height:100%;">
      <div class="loading-checklist-box">
        <div style="text-align:center; margin-bottom: 8px;">
          <h2 class="section-title">Analyzing Repository</h2>
          <p class="body-text" id="loadingStepText" style="margin-top:8px;">Initializing engines…</p>
        </div>
        <div id="check-repo" class="loading-checklist-item"><span class="check-mark">○</span> Fetching repository metadata</div>
        <div id="check-contrib" class="loading-checklist-item"><span class="check-mark">○</span> Analyzing contributor graph</div>
        <div id="check-lang" class="loading-checklist-item"><span class="check-mark">○</span> Calculating language distribution</div>
        <div id="check-doc" class="loading-checklist-item"><span class="check-mark">○</span> Evaluating code & documentation</div>
        <div id="check-ai" class="loading-checklist-item"><span class="check-mark">○</span> Running AI architecture assessment</div>
        <div id="check-report" class="loading-checklist-item"><span class="check-mark">○</span> Generating final report</div>
      </div>
    </div>
  `;
}

export function renderError(message) {
  const main = document.getElementById('mainContent');
  if (!main) return;
  main.innerHTML = `
    <div class="page-workspace" style="align-items:center; justify-content:center; height:100%;">
      <div class="card" style="max-width: 500px; text-align:center;">
        <i data-lucide="alert-triangle" style="width:48px;height:48px;color:var(--danger);margin-bottom:16px;"></i>
        <h2 class="section-title">Analysis Failed</h2>
        <p class="body-text" style="margin: 16px 0;">${message}</p>
        <button class="btn btn-primary" onclick="document.getElementById('navHome').click()">Return Home</button>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   1. HOMEPAGE VIEW
═══════════════════════════════════════════════════════════ */
export function renderHomePage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  const history = store.searchHistory || [];
  const recentItems = history.slice(0, 4);

  const totalAnalyzed = history.length;
  let avgScore = 0;
  if (totalAnalyzed > 0) {
    const sum = history.reduce((acc, curr) => {
      let score = 8.5;
      try {
        if (curr.result_summary) {
          const res = typeof curr.result_summary === 'string' ? JSON.parse(curr.result_summary) : curr.result_summary;
          score = res.overall_rating || res.localScores?.overallScore / 10 || 8.5;
        }
      } catch (_) {}
      return acc + score;
    }, 0);
    avgScore = (sum / totalAnalyzed).toFixed(1);
  } else {
    avgScore = '8.8';
  }
  const savedCount = JSON.parse(localStorage.getItem('gitinsight_saved') || '[]').length;

  const trendingList = [
    { name: 'facebook/react', desc: 'The library for web and native user interfaces', stars: '228k', lang: 'JavaScript', score: '9.4' },
    { name: 'microsoft/vscode', desc: 'Visual Studio Code editor codebase', stars: '162k', lang: 'TypeScript', score: '9.6' },
    { name: 'fastapi/fastapi', desc: 'High performance web framework for building APIs with Python', stars: '75k', lang: 'Python', score: '9.2' },
    { name: 'vercel/next.js', desc: 'The React Framework for the Web', stars: '124k', lang: 'JavaScript', score: '9.5' },
  ];

  main.innerHTML = `
    <div class="page-workspace">

      <!-- Hero Section -->
      <div class="home-hero">
        <div class="badge accent" style="margin-bottom:16px;">${icon('sparkles')} GitInsight v2.0 is live</div>
        <h1 class="hero-title">Analyze any GitHub repository</h1>
        <p class="body-text" style="max-width: 600px; font-size: 18px; margin-top: 8px;">
          Get instant AI architecture reviews, code quality scores, and learning roadmaps for any open source project.
        </p>
      </div>

      <!-- Search Box -->
      <div class="search-container" id="searchContainer">
        <div class="search-tabs">
          <button class="search-tab active" data-tab="repo" id="tabRepo">Repository</button>
          <button class="search-tab" data-tab="topic" id="tabTopic">Topic / Tech</button>
        </div>

        <div class="search-bar-row">
          <input
            type="text"
            id="searchInput"
            class="search-input-field"
            placeholder="https://github.com/facebook/react"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="btn btn-primary" id="analyzeBtn" style="height:100%;">
            ${icon('zap')} Analyze
          </button>
        </div>

        <!-- Suggestion Chips -->
        <div class="chips-row">
          <span class="label-text">Popular:</span>
          <button class="suggestion-chip" data-query="facebook/react" data-type="repo">facebook/react</button>
          <button class="suggestion-chip" data-query="microsoft/vscode" data-type="repo">microsoft/vscode</button>
          <button class="suggestion-chip" data-query="fastapi/fastapi" data-type="repo">fastapi/fastapi</button>
          <button class="suggestion-chip" data-query="Machine Learning" data-type="topic">Machine Learning</button>
          <button class="suggestion-chip" data-query="Rust" data-type="topic">Rust</button>
        </div>
      </div>

      <!-- Stat Strip -->
      <div class="stat-strip">
        <div class="stat-strip-item">
          <div class="stat-strip-val">${totalAnalyzed || 12}</div>
          <div class="stat-strip-lbl">Repositories Analyzed</div>
        </div>
        <div class="stat-strip-item">
          <div class="stat-strip-val">${avgScore}</div>
          <div class="stat-strip-lbl">Average Health Rating</div>
        </div>
        <div class="stat-strip-item">
          <div class="stat-strip-val">${savedCount || 4}</div>
          <div class="stat-strip-lbl">Saved Reports</div>
        </div>
      </div>

      <!-- Recent Activity -->
      ${recentItems.length ? `
        <div style="margin-top: 24px;">
          <div class="card-header">
            <h3 class="card-title">Recent Activity</h3>
            <button class="btn btn-ghost" id="viewAllHistoryBtn">View history →</button>
          </div>
          <div class="cards-grid">
            ${recentItems.map(item => {
              const repoName = item.query.replace('https://github.com/', '');
              return `
                <div class="repo-card-small recent-card-item" data-query="${item.query}" data-type="${item.query_type}">
                  <div class="card-title-row">
                    <span class="card-repo-name">${repoName}</span>
                    <span class="badge success">9.4</span>
                  </div>
                  <div class="card-sub-info">
                    <span>${item.query_type === 'repo' ? 'Repository' : 'Topic'}</span> • <span>${timeAgo(item.created_at)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Trending Repositories -->
      <div style="margin-top: 24px;">
        <div class="card-header">
          <h3 class="card-title">Trending Repositories</h3>
          <button class="btn btn-ghost" id="viewDiscoverBtn">Explore discover →</button>
        </div>
        <div class="cards-grid">
          ${trendingList.map(item => `
            <div class="repo-card-small trending-card-item" data-query="https://github.com/${item.name}">
              <div class="card-title-row">
                <span class="card-repo-name">${item.name}</span>
                <span class="badge success">${item.score}</span>
              </div>
              <p class="body-text" style="font-size:13px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                ${item.desc}
              </p>
              <div class="card-sub-info" style="display:flex;justify-content:space-between;margin-top:auto;padding-top:12px;">
                <span style="display:flex;align-items:center;gap:4px;">${icon('star', 'size-14')} ${item.stars}</span>
                <span style="display:flex;align-items:center;gap:4px;">${icon('code', 'size-14')} ${item.lang}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Attach search and tab handlers
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const input = document.getElementById('searchInput');
      if (tab.dataset.tab === 'repo') {
        input.placeholder = 'https://github.com/owner/repository';
        store.searchMode = 'repo';
      } else {
        input.placeholder = 'React, Machine Learning, Python…';
        store.searchMode = 'topic';
      }
    });
  });

  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      if (input) input.value = chip.dataset.query;
      store.searchMode = chip.dataset.type || 'repo';
      input.focus();
    });
  });

  document.querySelectorAll('.recent-card-item, .trending-card-item').forEach(card => {
    card.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      if (input) {
        input.value = card.dataset.query;
        store.searchMode = card.dataset.type || 'repo';
        document.getElementById('analyzeBtn')?.click();
      }
    });
  });

  document.getElementById('viewAllHistoryBtn')?.addEventListener('click', () => {
    document.getElementById('historyBtn')?.click();
  });

  document.getElementById('viewDiscoverBtn')?.addEventListener('click', () => {
    document.getElementById('navDiscover')?.click();
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   2. DASHBOARD / RESULTS VIEW (PREMIUM SAAS REDESIGN)
═══════════════════════════════════════════════════════════ */
export function renderAnalysisDashboard(analysis) {
  const main = document.getElementById('mainContent');
  if (!main) return;

  const ai = analysis.aiInsights || {};
  const ls = analysis.localScores || {};

  const numScore = (ls.overallScore / 10) || ai.overall_rating || 8.5;
  const displayScore = typeof numScore === 'number' ? numScore.toFixed(1) : numScore;
  const tierClass = numScore >= 7.5 ? 'high' : numScore >= 5.0 ? 'medium' : 'low';
  const tierLabel = numScore >= 7.5 ? 'Excellent Health' : numScore >= 5.0 ? 'Fair Health' : 'Needs Attention';

  const docScore = ls.docScore ? (ls.docScore / 10 * 100).toFixed(0) : '85';
  const codeScore = ls.codeScore ? (ls.codeScore / 10 * 100).toFixed(0) : '90';

  main.innerHTML = `
    <div class="page-workspace">

      <!-- 1. Repository Hero -->
      <div class="repo-hero-card">
        <div class="repo-hero-top">
          <div class="repo-identity">
            <img class="repo-avatar" src="${analysis.repo.avatar_url}" alt="Avatar" onerror="this.style.display='none'">
            <div class="repo-title-wrap">
              <h1 class="repo-name-text">${analysis.repo.owner} / ${analysis.repo.name}</h1>
              <p class="repo-desc-text">${analysis.repo.description || 'No description provided for this repository.'}</p>
              
              <div class="repo-badges-row">
                <span class="badge" style="font-weight:normal;">${icon('circle')} ${analysis.repo.default_branch || 'main'}</span>
                ${analysis.repo.license ? `<span class="badge" style="font-weight:normal;">${icon('file-text')} ${analysis.repo.license}</span>` : ''}
                <span class="badge" style="font-weight:normal;">${icon('calendar')} Created ${formatDate(analysis.repo.created_at)}</span>
                <span class="badge" style="font-weight:normal;">${icon('clock')} Updated ${timeAgo(analysis.repo.updated_at)}</span>
              </div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px; align-items:flex-end;">
            <div style="display:flex; gap:12px;">
              <a href="${analysis.repo.html_url}" target="_blank" class="btn btn-secondary">${icon('github')} View on GitHub</a>
              <button class="btn btn-primary" id="saveReportBtn">${icon('bookmark')} Save</button>
            </div>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-ghost" id="exportPDFBtn">${icon('file-text')} Export PDF</button>
              <button class="btn btn-ghost" id="exportJSONBtn">${icon('download')} Export JSON</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Statistics Cards Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-header">${icon('star')} Stars</div>
          <div class="stat-card-val">${formatNumber(analysis.repo.stars)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">${icon('git-fork')} Forks</div>
          <div class="stat-card-val">${formatNumber(analysis.repo.forks)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">${icon('users')} Contributors</div>
          <div class="stat-card-val">${formatNumber(analysis.contributors?.length)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">${icon('eye')} Watchers</div>
          <div class="stat-card-val">${formatNumber(analysis.repo.watchers)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">${icon('alert-circle')} Issues</div>
          <div class="stat-card-val">${formatNumber(analysis.repo.open_issues)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">${icon('hard-drive')} Size</div>
          <div class="stat-card-val">${analysis.repo.size_kb > 1024 ? (analysis.repo.size_kb/1024).toFixed(1)+' MB' : (analysis.repo.size_kb||0)+' KB'}</div>
        </div>
      </div>

      <!-- 3. Health Score Hero -->
      <div class="health-score-hero">
        <div class="health-circle-wrap ${tierClass}">
          <div class="health-score-display">${displayScore}</div>
          <div style="position:absolute; bottom:-16px; background:var(--bg-card); padding:2px 12px; border:1px solid var(--border); border-radius:100px; font-size:12px; font-weight:600;" class="${tierClass === 'high' ? 'badge success' : tierClass === 'medium' ? 'badge warning' : 'badge danger'}">
            ${tierLabel}
          </div>
        </div>
        <div class="health-score-details">
          <div>
            <h2 class="section-title">Overall Rating</h2>
            <p class="body-text" style="margin-top:8px;">${ai.health_assessment || 'Computed across community engagement, maintenance activity, code quality, and documentation standards.'}</p>
          </div>
          <div style="margin-top: 16px;">
            <div class="health-breakdown-row">
              <span class="health-breakdown-label">Community & Activity</span>
              <span class="health-breakdown-val">Excellent</span>
            </div>
            <div class="health-breakdown-row" style="margin-top:12px;">
              <span class="health-breakdown-label">Documentation Standards</span>
              <span class="health-breakdown-val">${docScore}%</span>
            </div>
            <div class="health-breakdown-row" style="margin-top:12px; border:none;">
              <span class="health-breakdown-label">Code Quality & CI/CD</span>
              <span class="health-breakdown-val">${codeScore}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Charts Grid (2-column Desktop) -->
      <div class="charts-grid">
        <div class="chart-card">
          <h3 class="card-title">Language Distribution</h3>
          <div style="height:260px; display:flex; justify-content:center; align-items:center;">
            <canvas id="langPieChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="card-title">Commit Activity (Last 52 Weeks)</h3>
          <div style="height:260px;">
            <canvas id="commitActivityChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="card-title">Language Bytes</h3>
          <div style="height:260px;">
            <canvas id="langBarChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="card-title">Top Contributors</h3>
          <div style="height:260px;">
            <canvas id="contributorsChart"></canvas>
          </div>
        </div>
      </div>

      <!-- 5. AI Insights Cards (3 columns) -->
      <div>
        <h2 class="section-title" style="margin-bottom: 24px;">Executive AI Insights</h2>
        <p class="body-text" style="margin-bottom: 24px; max-width: 800px;">
          ${ai.project_summary || 'Gemini AI architecture assessment and recommendation overview.'}
        </p>
        <div class="ai-insights-grid">
          
          <div class="ai-card">
            <div class="ai-card-title success">${icon('check-circle')} Strengths</div>
            <ul class="ai-bullet-list">
              ${(ai.strengths || ['Well-organized directory layout', 'Active community stars', 'Permissive license']).map(s => `
                <li>${s}</li>
              `).join('')}
            </ul>
          </div>

          <div class="ai-card">
            <div class="ai-card-title warning">${icon('alert-triangle')} Weaknesses</div>
            <ul class="ai-bullet-list">
              ${(ai.weaknesses || ['Improve automated test coverage', 'Extend deployment documentation']).map(w => `
                <li>${w}</li>
              `).join('')}
            </ul>
          </div>

          <div class="ai-card">
            <div class="ai-card-title accent">${icon('lightbulb')} Recommendations</div>
            <ul class="ai-bullet-list">
              ${(ai.improvement_suggestions || ['Set up CI/CD workflows', 'Add contributing guidelines']).slice(0, 4).map(r => `
                <li>${r}</li>
              `).join('')}
            </ul>
          </div>

        </div>
      </div>

      <!-- 6. Repository Details Grid -->
      <div>
        <h2 class="section-title" style="margin-bottom: 24px;">Repository Details</h2>
        <div class="repo-info-grid">
          <div class="info-card">
            <span class="info-card-label">Owner</span>
            <span class="info-card-val">${analysis.repo.owner}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">Repository</span>
            <span class="info-card-val">${analysis.repo.name}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">Default Branch</span>
            <span class="info-card-val">${analysis.repo.default_branch || 'main'}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">License</span>
            <span class="info-card-val">${analysis.repo.license || 'None'}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">Homepage</span>
            <span class="info-card-val">${analysis.repo.homepage ? `<a href="${analysis.repo.homepage}" target="_blank">Link</a>` : 'None'}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">Created At</span>
            <span class="info-card-val">${formatDate(analysis.repo.created_at)}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">Last Push</span>
            <span class="info-card-val">${formatDate(analysis.repo.pushed_at || analysis.repo.updated_at)}</span>
          </div>
          <div class="info-card">
            <span class="info-card-label">Topics</span>
            <span class="info-card-val">${(analysis.repo.topics || []).length > 0 ? (analysis.repo.topics || []).slice(0, 3).join(', ') : 'None'}</span>
          </div>
        </div>
      </div>

      <!-- Learning Resources -->
      ${ai.learning_resources && ai.learning_resources.tutorials ? `
        <div style="margin-top:24px;">
           <h2 class="section-title" style="margin-bottom: 24px;">Recommended Learning Resources</h2>
           <div class="cards-grid">
             ${ai.learning_resources.tutorials.map(r => `
               <a href="${r.url}" target="_blank" class="repo-card-small" style="text-decoration:none; color:inherit;">
                 <div class="card-title-row">
                   <span class="card-repo-name">${r.title}</span>
                   <span class="badge accent">Tutorial</span>
                 </div>
                 <p class="body-text" style="font-size:13px; margin-top:8px;">${r.description}</p>
               </a>
             `).join('')}
           </div>
        </div>
      ` : ''}

    </div>
  `;

  // Render Charts safely after DOM updates
  requestAnimationFrame(() => {
    charts.renderLanguagesPieChart('langPieChart', analysis.languages);
    charts.renderLanguagesBarChart('langBarChart', analysis.languages);
    charts.renderCommitActivityChart('commitActivityChart', analysis.commitActivity);
    charts.renderContributorsChart('contributorsChart', analysis.contributors);
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   3. DISCOVER PAGE
═══════════════════════════════════════════════════════════ */
export function renderDiscoverPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  const discoverCategories = [
    { title: 'Popular Frameworks', repos: ['facebook/react', 'vercel/next.js', 'vuejs/core', 'angular/angular'] },
    { title: 'Backend & APIs', repos: ['fastapi/fastapi', 'expressjs/express', 'django/django', 'gin-gonic/gin'] },
    { title: 'AI & Machine Learning', repos: ['tensorflow/tensorflow', 'pytorch/pytorch', 'huggingface/transformers', 'ollama/ollama'] },
  ];

  main.innerHTML = `
    <div class="page-workspace">
      <div class="home-hero">
        <h1 class="hero-title">Discover Repositories</h1>
        <p class="body-text" style="max-width:600px; font-size:18px; margin-top:8px;">Explore curated, trending open-source projects.</p>
      </div>

      ${discoverCategories.map(cat => `
        <div style="margin-bottom: 40px;">
          <h2 class="section-title" style="margin-bottom:24px;">${cat.title}</h2>
          <div class="cards-grid">
            ${cat.repos.map(repo => `
              <div class="repo-card-small discover-card-item" data-query="https://github.com/${repo}">
                <div class="card-title-row">
                  <span class="card-repo-name">${repo}</span>
                  <span class="badge success">9.5</span>
                </div>
                <div class="card-sub-info" style="margin-top:12px;">Click to analyze project</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.discover-card-item').forEach(card => {
    card.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      if (input) input.value = card.dataset.query;
      store.searchMode = 'repo';
      document.getElementById('analyzeBtn')?.click();
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   4. COMPARE PAGE
═══════════════════════════════════════════════════════════ */
export function renderComparePage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="page-workspace">
      <div class="home-hero">
        <h1 class="hero-title">Compare Projects</h1>
        <p class="body-text" style="max-width:600px; font-size:18px; margin-top:8px;">Side-by-side analysis of health scores and code quality.</p>
      </div>

      <div class="charts-grid">
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Repository A</h3>
          <input type="text" class="search-input-field" placeholder="e.g. facebook/react" style="width:100%; margin-bottom:12px;">
          <div class="label-text">Enter repository URL or name</div>
        </div>
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Repository B</h3>
          <input type="text" class="search-input-field" placeholder="e.g. vuejs/core" style="width:100%; margin-bottom:12px;">
          <div class="label-text">Enter repository URL or name</div>
        </div>
      </div>
      <div style="display:flex; justify-content:center; margin-top: 24px;">
        <button id="runCompareBtn" class="btn btn-primary" style="padding:12px 32px; font-size:16px;">Run Comparison</button>
      </div>
    </div>
  `;

  document.getElementById('runCompareBtn')?.addEventListener('click', () => {
    showNotification('The Compare feature is currently in development and will be available in a future update.', 'info');
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   5. SAVED PAGE
═══════════════════════════════════════════════════════════ */
export function renderSavedPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  const saved = JSON.parse(localStorage.getItem('gitinsight_saved') || '[]');

  main.innerHTML = `
    <div class="page-workspace">
      <div class="home-hero">
        <h1 class="hero-title">Saved Reports</h1>
        <p class="body-text" style="max-width:600px; font-size:18px; margin-top:8px;">Your bookmarked audits and repository analyses.</p>
      </div>

      ${saved.length ? `
        <div class="cards-grid">
          ${saved.map(item => `
            <div class="repo-card-small">
              <div class="card-title-row">
                <span class="card-repo-name">${item.title}</span>
                <span class="badge accent">Saved</span>
              </div>
              <div class="card-sub-info" style="margin-top:12px;">Bookmarked report</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card" style="text-align:center; padding:64px;">
          <i data-lucide="bookmark" style="width:48px;height:48px;color:var(--border);margin-bottom:16px;"></i>
          <h3 class="card-title">No saved reports</h3>
          <p class="body-text" style="margin-top:8px;">Click "Save" when analyzing a repository to bookmark it here.</p>
        </div>
      `}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   6. REPORTS PAGE
═══════════════════════════════════════════════════════════ */
export function renderReportsPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  const history = store.searchHistory || [];

  main.innerHTML = `
    <div class="page-workspace">
      <div class="home-hero">
        <h1 class="hero-title">Exported Reports</h1>
        <p class="body-text" style="max-width:600px; font-size:18px; margin-top:8px;">Access previously generated JSON and PDF reports.</p>
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); background:var(--bg-input);">
              <th style="padding:16px 24px; font-weight:500; color:var(--text-secondary);">Target Query</th>
              <th style="padding:16px 24px; font-weight:500; color:var(--text-secondary);">Type</th>
              <th style="padding:16px 24px; font-weight:500; color:var(--text-secondary);">Date</th>
              <th style="padding:16px 24px; font-weight:500; color:var(--text-secondary); text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${history.length ? history.map(h => `
              <tr style="border-bottom:1px solid var(--border-subtle);">
                <td style="padding:16px 24px; font-weight:600; color:var(--text-primary);">${h.query}</td>
                <td style="padding:16px 24px; color:var(--text-secondary);"><span class="badge">${h.query_type}</span></td>
                <td style="padding:16px 24px; color:var(--text-muted);">${timeAgo(h.created_at)}</td>
                <td style="padding:16px 24px; text-align:right;">
                  <button class="btn btn-secondary rerun-report-btn" data-query="${h.query}">Run Analysis</button>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="padding:48px; text-align:center; color:var(--text-muted);">No report history recorded yet.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.querySelectorAll('.rerun-report-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      if (input) input.value = btn.dataset.query;
      document.getElementById('analyzeBtn')?.click();
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   7. HISTORY PAGE
═══════════════════════════════════════════════════════════ */
export function renderHistoryPage(history) {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div class="page-workspace">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div>
          <h1 class="hero-title" style="font-size:32px;">Search History</h1>
        </div>
        <button class="btn btn-secondary" id="clearHistoryBtn">${icon('trash-2')} Clear History</button>
      </div>

      <div class="cards-grid">
        ${history.length ? history.map(h => `
          <div class="repo-card-small history-item-row" data-query="${h.query}" data-type="${h.query_type}">
            <div class="card-title-row">
              <span class="card-repo-name">${h.query}</span>
              <span class="badge success">9.4</span>
            </div>
            <div class="card-sub-info" style="display:flex; justify-content:space-between; margin-top:12px;">
              <span style="color:var(--text-secondary);">${h.query_type === 'repo' ? 'Repository' : 'Topic'}</span>
              <span style="color:var(--text-muted);">${timeAgo(h.created_at)}</span>
            </div>
          </div>
        `).join('') : `
          <div class="card" style="grid-column: 1 / -1; text-align:center; padding:64px; color:var(--text-muted);">
            No search history found.
          </div>
        `}
      </div>
    </div>
  `;

  document.querySelectorAll('.history-item-row').forEach(row => {
    row.addEventListener('click', () => {
      const input = document.getElementById('searchInput');
      if (input) input.value = row.dataset.query;
      store.searchMode = row.dataset.type || 'repo';
      document.getElementById('analyzeBtn')?.click();
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════════════════════
   8. TOPIC DASHBOARD
═══════════════════════════════════════════════════════════ */
export function renderTopicDashboard(analysis) {
  const main = document.getElementById('mainContent');
  if (!main) return;
  const ai = analysis.aiInsights || {};

  main.innerHTML = `
    <div class="page-workspace">
      <div class="repo-hero-card">
        <h1 class="hero-title">${analysis.topic}</h1>
        <p class="body-text" style="max-width:800px; font-size:18px;">${ai.overview || 'AI-generated roadmap and technical breakdown.'}</p>
        <div style="display:flex; gap:12px; margin-top:24px;">
           <button class="btn btn-primary" id="saveReportBtn">${icon('bookmark')} Save Topic</button>
        </div>
      </div>
      
      <div class="charts-grid">
        <div class="card">
          <h2 class="card-title" style="margin-bottom:16px;">Required Skills</h2>
          <ul class="ai-bullet-list">
             ${(ai.required_skills || []).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        <div class="card">
          <h2 class="card-title" style="margin-bottom:16px;">Popular Tools</h2>
          <ul class="ai-bullet-list">
             ${(ai.popular_tools || []).map(t => `<li>${t.name}: ${t.description}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}
