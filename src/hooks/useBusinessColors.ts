import { useEffect } from 'react';

interface BusinessColors {
  primary_color?: string;
  secondary_color?: string;
}

export function useBusinessColors(colors: BusinessColors | null | undefined) {
  useEffect(() => {
    const root = document.documentElement;

    if (colors?.primary_color) {
      root.style.setProperty('--business-primary', colors.primary_color);
    } else {
      root.style.removeProperty('--business-primary');
    }

    if (colors?.secondary_color) {
      root.style.setProperty('--business-secondary', colors.secondary_color);
    } else {
      root.style.removeProperty('--business-secondary');
    }

    return () => {
      root.style.removeProperty('--business-primary');
      root.style.removeProperty('--business-secondary');
    };
  }, [colors?.primary_color, colors?.secondary_color]);
}
