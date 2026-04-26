import { motion } from "framer-motion";
import { AVAILABLE_DRINKS } from "./useAlcoholOnboarding";

interface FavoritesStepProps {
  selectedDrinks: string[];
  onToggleDrink: (drinkId: string) => void;
}

export function FavoritesStep({
  selectedDrinks,
  onToggleDrink,
}: FavoritesStepProps) {
  const hasSelection = selectedDrinks.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-4">🍸</div>
        <h2 className="text-2xl font-bold text-slate-900">
          Vos boissons favorites
        </h2>
        <p className="text-slate-500">
          Sélectionnez celles que vous consommez régulièrement
        </p>
      </div>

      {/* Drinks Grid */}
      <div className="grid grid-cols-2 gap-3">
        {AVAILABLE_DRINKS.map((drink) => {
          const isSelected = selectedDrinks.includes(drink.id);
          return (
            <motion.button
              key={drink.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggleDrink(drink.id)}
              className={`
                relative flex flex-col items-center p-4 rounded-2xl border-2
                transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }
              `}
            >
              {/* Icon */}
              <span className="text-3xl mb-2">{drink.icon}</span>

              {/* Name */}
              <span
                className={`font-medium text-sm ${
                  isSelected ? "text-blue-700" : "text-slate-900"
                }`}
              >
                {drink.name}
              </span>

              {/* Volume & ABV */}
              <span className="text-xs text-slate-500 mt-1">
                {drink.volume} • {drink.abv}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Validation message */}
      {!hasSelection && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-amber-600"
        >
          Sélectionnez au moins une boisson
        </motion.p>
      )}

      {/* Selection summary */}
      {hasSelection && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-3"
        >
          <p className="text-sm text-green-700 text-center">
            ✓ {selectedDrinks.length} boisson
            {selectedDrinks.length > 1 ? "s" : ""} sélectionnée
            {selectedDrinks.length > 1 ? "s" : ""}
          </p>
        </motion.div>
      )}
    </div>
  );
}
