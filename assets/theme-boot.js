// Apply the saved appearance before the dashboard is painted.
(() => {
  const themes = ['afterglow', 'midnight', 'hearth', 'halloween', 'thanksgiving'];
  const normalize = theme => themes.includes(theme) ? theme : 'midnight';
  window.applyDashboardTheme = theme => {
    const next=normalize(theme),changed=document.documentElement.dataset.theme!==next;
    document.documentElement.dataset.theme = next;
    if(changed)document.dispatchEvent(new Event('dashboard-themechange'));
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
