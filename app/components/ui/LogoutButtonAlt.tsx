import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

const LogoutButtonAlt = () => {
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
    <button
      onClick={handleLogout}
      className="group p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
      <LogOut className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:!text-red-500 transition-colors duration-200" />
    </button>
  );
};

export default LogoutButtonAlt;
