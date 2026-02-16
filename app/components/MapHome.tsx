import { Home } from "lucide-react";

interface MapHomeProps {
  onZoomHome: () => void;
  isSubmitting?: boolean;
  uploadingImages?: boolean;
}

const MapHome = ({ onZoomHome, isSubmitting, uploadingImages }: MapHomeProps) => {
  const disabled = isSubmitting || uploadingImages;

  return (
    <button
      onClick={onZoomHome}
      className="absolute top-[52px] left-[8px] z-[1000] bg-white dark:bg-neutral-800 p-2 rounded-md shadow-md border hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Нулирай изгледа"
      disabled={disabled}
    >
      <Home className="w-5 h-5 text-neutral-800 dark:text-white" />
    </button>
  );
};

export default MapHome;