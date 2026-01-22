"use client"
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error.message);
      return;
    }
    router.push("/");
  };

  return (
    <Button
      variant="outline"
      className="w-full sm:flex-1 bg-background items-center hover:bg-red-500 transition duration-200 delay-50 hover:text-white"
      onClick={handleLogout}
    >
      Изход <LogOut className="h-4 w-4" />
    </Button>
  );
}
