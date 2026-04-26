import { motion } from "framer-motion";
import type { GoalType } from "./useAlcoholOnboarding";

interface GoalStepProps {
  selectedGoal: GoalType;
  onSelectGoal: (goal: GoalType) => void;
}

interface GoalOption {
  id: GoalType;
  icon: string;
  title: string;
  description: string;
}

const GOALS: GoalOption[] = [
  {
    id: "discover",
    icon: "🎯",
    title: "Découvrir",
    description: "Je veux juste suivre ma consommation",
  },
  {
    id: "moderate",
    icon: "⚖️",
    title: "Modérer",
    description: "Boire de manière responsable",
  },
  {
    id: "reduce",
    icon: "📉",
    title: "Réduire",
    description: "Diminuer progressivement",
  },
  {
    id: "sport",
    icon: "🏃",
    title: "Sport",
    description: "Optimiser ma récupération",
  },
  {
    id: "quit",
    icon: "🚫",
    title: "Arrêter",
    description: "Zéro alcool",
  },
];

export function GoalStep({ selectedGoal, onSelectGoal }: GoalStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-slate-900">
          Quel est votre objectif ?
        </h2>
        <p className="text-slate-500">
          Choisissez l'objectif qui vous correspond le mieux
        </p>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 gap-3">
        {GOALS.map((goal) => {
          const isSelected = selectedGoal === goal.id;
          return (
            <motion.button
              key={goal.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectGoal(goal.id)}
              className={`
                relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left
                transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              {/* Icon */}
              <span className="text-3xl">{goal.icon}</span>

              {/* Text */}
              <div className="flex-1">
                <h3
                  className={`font-semibold text-lg ${
                    isSelected ? "text-blue-700" : "text-slate-900"
                  }`}
                >
                  {goal.title}
                </h3>
                <p
                  className={`text-sm ${
                    isSelected ? "text-blue-600" : "text-slate-500"
                  }`}
                >
                  {goal.description}
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                >
                  <svg
                    className="w-4 h-4 text-white"
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
    </div>
  );
}
