// Apply the saved appearance before the dashboard is painted.
(() => {
  const themes = ['afterglow', 'midnight', 'hearth'];
  const normalize = theme => themes.includes(theme) ? theme : 'midnight';
  window.applyDashboardTheme = theme => {
    document.documentElement.dataset.theme = normalize(theme);
    for (const frame of document.querySelectorAll('iframe')) {
      try { frame.contentWindow?.applyDashboardTheme?.(theme); } catch {}
    }
  };
  let theme = 'midnight';
  try { theme = JSON.parse(localStorage.getItem('dashboard-preferences') || '{}')?.theme; } catch {}
  window.applyDashboardTheme(theme);
  window.addEventListener('storage', event => {
    if (event.key !== 'dashboard-preferences') return;
    try { window.applyDashboardTheme(JSON.parse(event.newValue || '{}')?.theme); } catch {}
  });
})();
