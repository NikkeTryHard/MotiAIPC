import { dom } from '../config.js';

const COLOR_THEMES = ['default', 'velvet'];

export function handleThemeToggle() {
  const newTheme = dom.themeToggle.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('motiAITheme', newTheme);
}

export function handleThemeColorChange() {
  const currentTheme =
    document.documentElement.getAttribute('data-color-theme') || 'default';
  const currentIndex = COLOR_THEMES.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % COLOR_THEMES.length;
  const newTheme = COLOR_THEMES[nextIndex];

  document.documentElement.setAttribute('data-color-theme', newTheme);
  localStorage.setItem('motiAIColorTheme', newTheme);
}
