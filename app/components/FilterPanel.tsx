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
  filteredBins,
  bins,
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
    <div className="absolute top-[8px] left-[54px] z-[1000] bg-white p-4 rounded-md shadow-lg border max-w-xs w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-gray-800">
          Филтри за материали
        </h3>
        <button
          onClick={() => setShowFilterPanel(false)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Активни филтри:
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-800"
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
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
                  style={{
                    background: "linear-gradient(to right, #60a5fa, #3b82f6)",
                  }}
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
              className={`flex items-center justify-between w-full p-3 rounded-lg border transition-all ${
                isActive
                  ? "ring-2 ring-green-500 ring-offset-1 border-blue-500"
                  : "hover:bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${filter.color}`}></div>
                <span className="font-medium text-gray-800">
                  {filter.label}
                </span>
              </div>
              {isActive && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
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
