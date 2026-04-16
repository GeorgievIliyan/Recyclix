import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: 'bg', label: 'БГ' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'РУ' },
];

function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={`px-3 py-1 rounded-md text-sm border transition-colors duration-200
            ${i18n.language === code
              ? 'bg-green-500 text-white border-green-500'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-green-500/50 text-foreground'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSelector;