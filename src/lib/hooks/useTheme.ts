import { useState, useEffect } from 'react';

export function useTheme() {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Theme setup - defaults to dark mode
    const savedTheme = localStorage.getItem('dean_tracker_theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.documentElement.classList.add('light');
    } else {
      setIsLightMode(false);
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('light');
        localStorage.setItem('dean_tracker_theme', 'light');
      } else {
        document.documentElement.classList.remove('light');
        localStorage.setItem('dean_tracker_theme', 'dark');
      }
      return next;
    });
  };

  return { isLightMode, toggleTheme };
}
