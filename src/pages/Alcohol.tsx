import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wine, RefreshCw, User, Target, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlcoholOnboardingWizard,
  useAlcoholOnboarding,
  AVAILABLE_DRINKS,
  type GoalType,
} from "@/components/onboarding/alcohol/useAlcoholOnboarding";

const GOAL_LABELS: Record<Exclude<GoalType, null>, { label: string; icon: string; color: string }> = {
  discover: { label: "Découvrir", icon: "🎯", color: "bg-blue-100 text-blue-700" },
  moderate: { label: "Modérer", icon: "⚖️", color: "bg-green-100 text-green-700" },
  reduce: { label: "Réduire", icon: "📉", color: "bg-amber-100 text-amber-700" },
  sport: { label: "Sport", icon: "🏃", color: "bg-purple-100 text-purple-700" },
  quit: { label: "Arrêter", icon: "🚫", color: "bg-red-100 text-red-700" },
};

export default function AlcoholPage() {
  const { profile, hasCompleted, isLoading, reset } = useAlcoholOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelpButton, setShowHelpButton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!hasCompleted) {
        setShowOnboarding(true);
        setShowHelpButton(false);
      } else {
        setShowOnboarding(false);
        setShowHelpButton(true);
      }
    }
  }, [isLoading, hasCompleted]);

  const handleRestartOnboarding = () => {
    reset();
    setShowOnboarding(true);
    setShowHelpButton(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowHelpButton(true);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    setShowHelpButton(true);
  };

  const getSelectedDrinksInfo = () => {
    return profile.favoriteDrinks.map((id) => AVAILABLE_DRINKS.find((d) => d.id === id)).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Help Button */}
      {showHelpButton && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={handleRestartOnboarding}
            variant="outline"
            className="gap-2 rounded-xl border-slate-200 bg-white shadow-md hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Recommencer
          </Button>
        </div>
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <AlcoholOnboardingWizard
          isOpen={showOnboarding}
          onClose={handleOnboardingClose}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Main Content */}
      {!showOnboarding && hasCompleted && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Wine className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Alcohol Tracker</h1>
            <p className="text-slate-500 mt-2">
              Bienvenue dans votre assistant de suivi de consommation
            </p>
          </div>

          {/* Profile Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Goal Card */}
            <Card className="border-slate-200 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Objectif
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.goal && GOAL_LABELS[profile.goal] && (
                  <Badge className={`${GOAL_LABELS[profile.goal].color} text-sm px-3 py-1`}>
                    <span className="mr-1">{GOAL_LABELS[profile.goal].icon}</span>
                    {GOAL_LABELS[profile.goal].label}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Profile Card */}
            <Card className="border-slate-200 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-900">
                  {profile.sex === "male" ? "👨" : "👩"} {profile.weight} kg
                </p>
              </CardContent>
            </Card>

            {/* Favorites Card */}
            <Card className="border-slate-200 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Boissons favorites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-900">
                  {profile.favoriteDrinks.length} sélectionnée
                  {profile.favoriteDrinks.length > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Drinks Grid */}
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle>Vos boissons favorites</CardTitle>
              <CardDescription>
                Base de calcul pour vos unités d'alcool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {getSelectedDrinksInfo().map((drink) => (
                  <div
                    key={drink!.id}
                    className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <span className="text-3xl mb-2">{drink!.icon}</span>
                    <span className="font-medium text-slate-900 text-sm">{drink!.name}</span>
                    <span className="text-xs text-slate-500 mt-1">
                      {drink!.volume} • {drink!.abv}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="mt-8 text-center">
            <Link to="/">
              <Button variant="outline" className="rounded-xl">
                ← Retour au tableau de bord
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
