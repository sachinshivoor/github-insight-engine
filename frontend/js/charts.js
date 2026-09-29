// Chart.js chart rendering utilities

const chartInstances = {};

const PALETTE = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#f97316',
  '#14b8a6', '#a855f7', '#3b82f6', '#84cc16',
];

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#c22d40',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883',
  Svelte: '#ff3e00', Elixir: '#6e4a7e', Haskell: '#5e5086', Lua: '#000080',
  R: '#198CE7', MATLAB: '#e16737', Julia: '#a270ba', Vim: '#199f4b',
};

function getLangColor(lang) {
  return LANG_COLORS[lang] || PALETTE[Object.keys(LANG_COLORS).length % PALETTE.length];
}

function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

function darkChartDefaults() {
  return {
    color: '#94a3b8',
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 }, padding: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(15,15,35,0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(99,102,241,0.4)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    animation: { duration: 800, easing: 'easeInOutQuart' },
  };
}

export function renderLanguagesPieChart(canvasId, languages) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !languages || Object.keys(languages).length === 0) return;

  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const defaults = darkChartDefaults();

  chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: entries.map(([l]) => l),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([l]) => getLangColor(l)),
        borderColor: '#0f0f2e',
        borderWidth: 3,
        hoverBorderWidth: 1,
        hoverOffset: 8,
      }],
    },
    options: {
      ...defaults,
      cutout: '65%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...defaults.plugins,
        legend: {
          ...defaults.plugins.legend,
          position: 'right',
        },
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
          },
        },
      },
    },
  });
}

export function renderLanguagesBarChart(canvasId, languages) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !languages || Object.keys(languages).length === 0) return;

  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const defaults = darkChartDefaults();

  chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: entries.map(([l]) => l),
      datasets: [{
        label: 'Usage %',
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([l]) => getLangColor(l) + 'cc'),
        borderColor: entries.map(([l]) => getLangColor(l)),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...defaults,
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8', callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'rgba(255,255,255,0.1)' },
        },
        y: {
          ticks: { color: '#cbd5e1', font: { family: 'Inter', size: 12 } },
          grid: { display: false },
          border: { color: 'rgba(255,255,255,0.1)' },
        },
      },
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(1)}%` },
        },
      },
    },
  });
}

export function renderCommitActivityChart(canvasId, weeklyData) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const weeks = weeklyData?.length ? weeklyData : Array(52).fill({ total: 0 });
  const labels = weeks.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (52 - i) * 7);
    return i % 8 === 0 ? d.toLocaleDateString('en', { month: 'short' }) : '';
  });
  const data = weeks.map(w => w?.total || 0);
  const defaults = darkChartDefaults();

  chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Commits / week',
        data,
        fill: true,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0, 'rgba(99,102,241,0.4)');
          g.addColorStop(1, 'rgba(99,102,241,0)');
          return g;
        },
        borderColor: '#6366f1',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#6366f1',
        tension: 0.4,
      }],
    },
    options: {
      ...defaults,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.1)' },
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.1)' },
          beginAtZero: true,
        },
      },
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
      },
    },
  });
}

export function renderMonthlyCommitChart(canvasId, weeklyData) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !weeklyData?.length) return;

  // Group weekly data into months (last 12 months)
  const months = {};
  weeklyData.slice(-52).forEach((week, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (52 - i) * 7);
    const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    months[key] = (months[key] || 0) + (week?.total || 0);
  });

  const entries = Object.entries(months).slice(-12);
  const defaults = darkChartDefaults();

  chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: entries.map(([l]) => l),
      datasets: [{
        label: 'Commits',
        data: entries.map(([, v]) => v),
        backgroundColor: 'rgba(139,92,246,0.7)',
        borderColor: '#8b5cf6',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...defaults,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxRotation: 0 },
          grid: { display: false },
          border: { color: 'rgba(255,255,255,0.1)' },
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.1)' },
          beginAtZero: true,
        },
      },
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
      },
    },
  });
}

export function renderContributorsChart(canvasId, contributors) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas || !contributors?.length) return;

  const top = contributors.slice(0, 8);
  const defaults = darkChartDefaults();

  chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: top.map(c => c.login),
      datasets: [{
        label: 'Contributions',
        data: top.map(c => c.contributions),
        backgroundColor: PALETTE.slice(0, top.length).map(c => c + 'cc'),
        borderColor: PALETTE.slice(0, top.length),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...defaults,
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.1)' },
          beginAtZero: true,
        },
        y: {
          ticks: { color: '#cbd5e1' },
          grid: { display: false },
          border: { color: 'rgba(255,255,255,0.1)' },
        },
      },
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
      },
    },
  });
}

export { getLangColor, destroyChart };
