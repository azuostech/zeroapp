'use client';

import { useEffect } from 'react';

const ICON_VERSION = '20260510d';

const THEME_ICONS = {
  light: {
    icon192: `/icons/manifest-icon-192-light.maskable.png?v=${ICON_VERSION}`,
    icon512: `/icons/manifest-icon-512-light.maskable.png?v=${ICON_VERSION}`,
    apple: `/icons/apple-icon-180-light.png?v=${ICON_VERSION}`
  },
  dark: {
    icon192: `/icons/manifest-icon-192-dark.maskable.png?v=${ICON_VERSION}`,
    icon512: `/icons/manifest-icon-512-dark.maskable.png?v=${ICON_VERSION}`,
    apple: `/icons/apple-icon-180-dark.png?v=${ICON_VERSION}`
  }
};

function resolveTheme() {
  return 'light';
}

function applyThemeAssets(theme) {
  const icons = THEME_ICONS[theme === 'dark' ? 'dark' : 'light'];
  const favicon = document.getElementById('theme-favicon');
  const faviconShortcut = document.getElementById('theme-favicon-shortcut');
  const appleIcon = document.getElementById('theme-apple-icon');
  const tile = document.getElementById('theme-ms-tile');

  if (favicon) favicon.setAttribute('href', icons.icon192);
  if (faviconShortcut) faviconShortcut.setAttribute('href', icons.icon192);
  if (appleIcon) appleIcon.setAttribute('href', icons.apple);
  if (tile) tile.setAttribute('content', icons.icon512);
}

export default function ThemeAssetSync() {
  useEffect(() => {
    const syncAssets = () => {
      applyThemeAssets(resolveTheme());
    };

    syncAssets();

    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'data-theme')) {
        syncAssets();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    window.addEventListener('storage', syncAssets);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncAssets);
    };
  }, []);

  return null;
}
