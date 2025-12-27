"use client";

import { ThemeProvider } from "next-themes";
// функция за превключване между светъл и тъмен режим
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      {children}
    </ThemeProvider>
  );
}
