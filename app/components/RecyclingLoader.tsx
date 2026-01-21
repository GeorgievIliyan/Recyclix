"use client"

export function RecyclingLoader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-green-200 dark:border-green-900/30" />
        <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        <div className="absolute inset-2 flex items-center justify-center p-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-full h-full text-green-600 dark:text-green-400"
          >
            <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
            <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
            <path d="m14 16-3 3 3 3"/>
            <path d="M8.293 13.596 7.196 9.5 3.1 10.598"/>
            <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/>
            <path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>
          </svg>
        </div>
      </div>
      
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
        Зареждане...
      </p>
    </div>
  )
}

export function SpinningRecyclingLoader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/10 rounded-full animate-ping" />
        <div className="relative w-14 h-14">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-full h-full text-green-500 animate-spin"
            style={{ transformOrigin: 'center' }}
          >
            <g transform="translate(12, 12)">
              <g transform="scale(0.8) translate(-12, -12)">
                <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
                <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
                <path d="m14 16-3 3 3 3"/>
                <path d="M8.293 13.596 7.196 9.5 3.1 10.598"/>
                <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/>
                <path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>
              </g>
            </g>
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 animate-pulse">
        Рециклиране...
      </p>
    </div>
  )
}

export function SimpleSpinningRecycling() {
  return (
    <div className="inline-flex items-center justify-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-green-500 animate-spin"
      >
        <g transform="translate(12, 12) scale(0.85) translate(-12, -12)">
          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
          <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
          <path d="m14 16-3 3 3 3"/>
          <path d="M8.293 13.596 7.196 9.5 3.1 10.598"/>
          <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/>
          <path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>
        </g>
      </svg>
    </div>
  )
}