"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, TextAlignStart, SquarePen } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { RecyclingLoader } from "@/app/components/RecyclingLoader";
import { LogoutButton } from "@/app/components/LogoutButton";
import { Navigation } from "@/app/components/Navigation";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  initials: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData.user) {
        console.error(authError);
        setLoading(false);
        return;
      }

      const user = authData.user;

      setUser({
        id: user.id,
        email: user.email ?? "",
        created_at: user.created_at,
        initials:
          user.email
            ?.split("@")[0]
            .split(".")
            .map((x) => x[0].toUpperCase())
            .join("") ?? "",
      });

      setLastPasswordChange(user.updated_at!);

      setLoading(false);
    }

    fetchUser();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <RecyclingLoader />
      </div>
    );

  if (!user) return <p className="p-4 text-center">Не е намерен потребител</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-zinc-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-zinc-900">
      <Navigation />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 md:pt-16 lg:pt-20">
        {/* Картичка за профила */}
        <Card className="mb-6 border-neutral-200/50 dark:border-neutral-800/50 hover:border-green-500/30 transition-colors duration-300 overflow-hidden">
          <CardContent className="items-center">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Avatar className="size-20 sm:size-24 ring-2 ring-green-500/20 ring-offset-2 ring-offset-background">
                <AvatarFallback className="bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 text-2xl text-white">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {user.email}
                </h1>
                <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
                  <span className="inline-block size-2 rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-sm shadow-green-500/50"></span>
                  Активен акаунт
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Детайли за акаунта */}
        <Card className="mb-6 gap-2 border-neutral-200/50 dark:border-neutral-800/50 hover:border-green-500/20 transition-colors duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl flex flex-row gap-2 items-center">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400/10 to-green-500/10">
                <TextAlignStart className="w-5 h-5 text-green-500" />
              </div>
              <p>Данни за акаунта</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200">
              <p className="text-sm font-medium text-muted-foreground">Имейл</p>
              <p className="text-sm sm:text-base md:text-lg text-foreground">
                {user.email}
              </p>
            </div>
            <div className="space-y-1 p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200">
              <p className="text-sm font-medium text-muted-foreground">
                Дата на регистрация
              </p>
              <p className="text-base text-foreground">
                {new Date(user.created_at).toLocaleDateString("bg-BG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Карта за сигурност */}
        <Card className="mb-6 gap-2 border-neutral-200/50 dark:border-neutral-800/50 hover:border-green-500/20 transition-colors duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl flex flex-row gap-2 items-center">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-400/10 to-green-500/10">
                <Lock className="w-5 h-5 text-green-500" />
              </div>
              <p>Сигурност</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-0 pt-0 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent transition-colors duration-200">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Статус
                </p>
                <p className="text-base text-foreground">
                  Последна промяна:{" "}
                  {lastPasswordChange
                    ? new Date(lastPasswordChange).toLocaleDateString("bg-BG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full sm:w-auto bg-transparent hover:bg-gradient-to-r hover:from-green-500/10 hover:to-transparent hover:border-green-500/40 transition-all duration-200"
              >
                <Lock className="mr-1 size-4" />
                Промени парола
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Бутони */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="group w-full text-white dark:text-white sm:flex-1 bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 hover:from-green-500 hover:via-green-600 hover:to-emerald-700 transition-all duration-200 items-center hover:shadow-lg hover:shadow-green-500/20">
            Редактирай профил
            <SquarePen className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          </Button>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
