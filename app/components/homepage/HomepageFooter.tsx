const HomepageFooter = () => {
  return (
    <footer className="relative border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/logos/logo.svg"
                alt="Logo"
                className="aspect-1/1 h-6"
              />
              <span className="text-2xl font-semibold bg-gradient-to-r from-[#00CD56] to-[#00b849] bg-clip-text text-transparent">
                Recyclix
              </span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md">
              Платформата за рециклиране, която прави опазването на околната
              среда лесно и награждаващо.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Бързи връзки
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Предимства
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Как работи
                </a>
              </li>
              <li>
                <a
                  href="#impact"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Въздействие
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Цени
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Акаунт
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/auth/login"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Вход
                </a>
              </li>
              <li>
                <a
                  href="/auth/register"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Регистрация
                </a>
              </li>
              <li>
                <a
                  href="/admin/panel"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Администрация
                </a>
              </li>
              <li>
                <a
                  href="/org/dashboard"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-[#00CD56] dark:hover:text-[#00CD56] transition duration-150"
                >
                  Мениджмънт
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-zinc-500 dark:text-zinc-500 text-sm">
          © {new Date().getFullYear()} Recyclix. Всички права запазени.
        </div>
      </div>
    </footer>
  );
};

export default HomepageFooter;