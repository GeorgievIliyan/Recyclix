import { memo } from "react";
import { Bin } from "./MapComponent";
import { X } from "lucide-react";
import { FILTER_OPTIONS } from "./MapComponent";

const FilterPanel = memo(function FilterPanel({
  showFilterPanel,
  setShowFilterPanel,
  activeFilters,
  clearAllFilters,
  removeFilter,
  toggleFilter,
}: {
  showFilterPanel: boolean;
  setShowFilterPanel: (show: boolean) => void;
  activeFilters: string[];
  clearAllFilters: () => void;
  removeFilter: (filterId: string) => void;
  toggleFilter: (filterId: string) => void;
  filteredBins: Bin[];
  bins: Bin[];
}) {
  if (!showFilterPanel) return null;

  return (
    <div
      className="absolute top-[8px] left-[54px] z-[1000]
      bg-white dark:bg-neutral-900
      p-4 rounded-md shadow-lg
      border border-gray-200 dark:border-neutral-700
      max-w-xs w-64"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
          Филтри за материали
        </h3>

        <button
          onClick={() => setShowFilterPanel(false)}
          className="p-1 rounded transition
            hover:bg-gray-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Активни филтри:
            </span>

            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-emerald-600
                dark:text-gray-400 dark:hover:text-emerald-400 transition"
            >
              Изчисти всички
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filterId) => {
              const filter = FILTER_OPTIONS.find((f) => f.id === filterId);
              if (!filter) return null;

              return (
                <div
                  key={filterId}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white
                  bg-gradient-to-r ${filter.color}`}
                >
                  <span>{filter.label}</span>
                  <button
                    onClick={() => removeFilter(filterId)}
                    className="ml-1 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilters.includes(filter.id);

          return (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              className={`flex items-center justify-between w-full p-3 rounded-lg border transition-all
                ${
                  isActive
                    ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 border-gray-300 dark:border-neutral-600"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-800 border-gray-200 dark:border-neutral-700"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${filter.color}`} />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {filter.label}
                </span>
              </div>

              {isActive && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default FilterPanel;
