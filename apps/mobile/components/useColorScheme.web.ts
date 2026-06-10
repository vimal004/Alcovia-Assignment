import { useEffect, useState } from 'react';
import { ColorSchemeName } from 'react-native';

export function useColorScheme(): ColorSchemeName {
  const [scheme, setScheme] = useState<ColorSchemeName>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Modern change listener
    const listener = (e: MediaQueryListEvent) => {
      setScheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return scheme;
}
