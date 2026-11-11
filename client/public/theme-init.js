(() => {
  try {
    const stored = localStorage.getItem('mabdeen_theme') || localStorage.getItem('saleka_theme') || localStorage.getItem('mansa_theme');
    const dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch {}
})();
