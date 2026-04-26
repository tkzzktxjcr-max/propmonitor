import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAlcoholOnboarding } from "./useAlcoholOnboarding";
import { GoalStep } from "./GoalStep";
import { ProfileStep } from "./ProfileStep";
import { FavoritesStep } from "./FavoritesStep";

interface AlcoholOnboardingWizardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
}

const TOTAL_STEPS = 3;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function AlcoholOnboardingWizard({
  isOpen = true,
  onClose,
  onComplete,
}: AlcoholOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showLaterOption, setShowLaterOption] = useState(true);

  const {
    profile,
    setGoal,
    setSex,
    setWeight,
    toggleFavoriteDrink,
    complete,
  } = useAlcoholOnboarding();

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return profile.goal !== null;
      case 1:
        return profile.weight > 0 && profile.weight <= 300;
      case 2:
        return profile.favoriteDrinks.length > 0;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1 && canProceed()) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    complete();
    onComplete?.();
  };

  const handleClose = () => {
    onClose?.();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <GoalStep
            selectedGoal={profile.goal}
            onSelectGoal={setGoal}
          />
        );
      case 1:
        return (
          <ProfileStep
            sex={profile.sex}
            weight={profile.weight}
            onSexChange={setSex}
            onWeightChange={setWeight}
          />
        );
      case 2:
        return (
          <FavoritesStep
            selectedDrinks={profile.favoriteDrinks}
            onToggleDrink={toggleFavoriteDrink}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 0:
        return "Objectif";
      case 1:
        return "Profil";
      case 2:
        return "Boissons";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-3xl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 w-8 h-8 rounded-full"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>

          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Configuration Alcohol Tracker
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Étape {currentStep + 1} sur {TOTAL_STEPS} • {getStepTitle()}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <motion.div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-8 bg-blue-500"
                    : index < currentStep
                    ? "w-2 bg-blue-500"
                    : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative px-6 pb-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div>
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={goPrev}
                className="text-slate-600 hover:text-slate-900"
              >
                ← Précédent
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showLaterOption && currentStep === 0 && (
              <Button
                variant="link"
                onClick={handleClose}
                className="text-sm text-slate-400 hover:text-slate-600 p-0"
              >
                Plus tard
              </Button>
            )}

            {currentStep < TOTAL_STEPS - 1 ? (
              <Button
                onClick={goNext}
                disabled={!canProceed()}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6"
              >
                Suivant →
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-6"
              >
                Terminer ✓
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
