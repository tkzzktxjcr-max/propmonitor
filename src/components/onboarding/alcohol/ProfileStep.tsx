import { motion } from "framer-motion";
import type { SexType } from "./useAlcoholOnboarding";

interface ProfileStepProps {
  sex: SexType;
  weight: number;
  onSexChange: (sex: SexType) => void;
  onWeightChange: (weight: number) => void;
}

export function ProfileStep({
  sex,
  weight,
  onSexChange,
  onWeightChange,
}: ProfileStepProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-2xl font-bold text-slate-900">Votre profil</h2>
        <p className="text-slate-500">
          Pour des calculs plus précis de votre taux d'alcoolémie
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Sex Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Sexe
          </label>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSexChange("male")}
              className={`
                flex items-center justify-center gap-2 p-4 rounded-2xl border-2
                transition-all duration-200 cursor-pointer
                ${
                  sex === "male"
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }
              `}
            >
              <span className="text-2xl">👨</span>
              <span
                className={`font-medium ${
                  sex === "male" ? "text-blue-700" : "text-slate-700"
                }`}
              >
                Homme
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSexChange("female")}
              className={`
                flex items-center justify-center gap-2 p-4 rounded-2xl border-2
                transition-all duration-200 cursor-pointer
                ${
                  sex === "female"
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }
              `}
            >
              <span className="text-2xl">👩</span>
              <span
                className={`font-medium ${
                  sex === "female" ? "text-blue-700" : "text-slate-700"
                }`}
              >
                Femme
              </span>
            </motion.button>
          </div>
        </div>

        {/* Weight Input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Poids (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              value={weight}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val > 0 && val <= 300) {
                  onWeightChange(val);
                }
              }}
              min={30}
              max={300}
              className="
                w-full p-4 pl-12 text-lg rounded-2xl border-2 border-slate-200
                bg-white text-slate-900
                focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                outline-none transition-all
              "
              placeholder="70"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl">
              ⚖️
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Utilisez votre poids corporel actuel pour des résultats plus précis
          </p>
        </div>
      </div>
    </div>
  );
}
