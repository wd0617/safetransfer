import { Toaster, toast } from 'sonner';
import { ReactNode } from 'react';
import { useTheme } from './ThemeContext';

export { toast };

export function ToastProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
        theme={resolvedTheme}
      />
    </>
  );
}
