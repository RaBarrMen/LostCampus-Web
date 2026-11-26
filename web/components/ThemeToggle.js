'use client';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'light');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('lc-theme', next);
    } catch {}
    setTheme(next);
  };

  return (
    <button onClick={toggle} aria-label="Cambiar tema" className={`grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink transition hover:bg-surface-2 ${className}`}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// Script que aplica el tema antes de pintar (evita parpadeo)
export const themeScript = `try{var t=localStorage.getItem('lc-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}`;
