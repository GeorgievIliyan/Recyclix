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
      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:[&_svg]:!text-red-500"
    >
      <LogOut className="w-4 h-4 text-neutral-600 dark:neutral-500 transition duration-300" />
    </button>
  );
};

export default LogoutButtonAlt;
