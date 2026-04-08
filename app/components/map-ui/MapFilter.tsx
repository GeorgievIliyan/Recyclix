"use client";

import { Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPreferredLanguage } from "@/lib/utils";

interface MapFilterProps {
  setShowFilterPanel: (show: boolean) => void;
  showFilterPanel: boolean;
  activeFilters: string[];
  isSubmitting?: boolean;
  uploadingImages?: boolean;
}

const MapFilter = ({ setShowFilterPanel, showFilterPanel, activeFilters, isSubmitting, uploadingImages }: MapFilterProps) => {
  const { t, i18n } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const disabled = isSubmitting || uploadingImages;

  useEffect(() => {
    const preferredLang = getPreferredLanguage();
    if (i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang);
    }
    document.documentElement.lang = preferredLang;
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setShowFilterPanel(!showFilterPanel)}
      className="absolute top-[8px] left-[8px] z-[1000] bg-white dark:bg-neutral-800 p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={t("gamification.mapFilter.title", { defaultValue: "Филтри" })}
      disabled={disabled}
    >
      <Filter className="w-5 h-5 text-neutral-800 dark:text-white" />
      {activeFilters.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {activeFilters.length}
        </span>
      )}
    </button>
  );
};

export default MapFilter;