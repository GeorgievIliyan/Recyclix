"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // против проблеми с
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="size-9" />;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="size-9 rounded-lg border-neutral-300 dark:border-neutral-700 hover:border-green-500/50 dark:hover:border-green-500/20 text-foreground bg-transparent hover:bg-gradient-to-br hover:from-green-500/10 hover:to-emerald-500/10 hover:text-green-600 dark:hover:text-green-400 transition-all duration-300"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}