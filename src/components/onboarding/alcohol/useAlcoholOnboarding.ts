import { useState, useEffect, useCallback } from "react";

export type GoalType = "discover" | "moderate" | "reduce" | "sport" | "quit" | null;
export type SexType = "male" | "female";

export interface AlcoholProfile {
  goal: GoalType;
  sex: SexType;
  weight: number;
  favoriteDrinks: string[];
}

export interface Drink {
  id: string;
  name: string;
  volume: string;
  abv: string;
  icon: string;
}

export const AVAILABLE_DRINKS: Drink[] = [
  { id: "beer", name: "Bière", volume: "25cl", abv: "5°", icon: "🍺" },
  { id: "wine", name: "Vin", volume: "12cl", abv: "12°", icon: "🍷" },
  { id: "whisky", name: "Whisky", volume: "4cl", abv: "40°", icon: "🥃" },
  { id: "vodka", name: "Vodka", volume: "4cl", abv: "40°", icon: "🍸" },
  { id: "champagne", name: "Champagne", volume: "12cl", abv: "12°", icon: "🍾" },
  { id: "cocktail", name: "Cocktail", volume: "8cl", abv: "25°", icon: "🍹" },
  { id: "cider", name: "Cidre", volume: "33cl", abv: "5°", icon: "🍎" },
];

const STORAGE_KEY = "fh_alcohol_onboarding";

const DEFAULT_PROFILE: AlcoholProfile = {
  goal: null,
  sex: "male",
  weight: 70,
  favoriteDrinks: [],
};

export function useAlcoholOnboarding() {
  const [profile, setProfile] = useState<AlcoholProfile>(DEFAULT_PROFILE);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProfile(parsed.profile || DEFAULT_PROFILE);
        setHasCompleted(parsed.hasCompleted || false);
      } catch {
        setProfile(DEFAULT_PROFILE);
        setHasCompleted(false);
      }
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever profile or completion status changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ profile, hasCompleted })
      );
    }
  }, [profile, hasCompleted, isLoading]);

  const updateProfile = useCallback((updates: Partial<AlcoholProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const complete = useCallback(() => {
    setHasCompleted(true);
  }, []);

  const reset = useCallback(() => {
    setHasCompleted(false);
    setProfile(DEFAULT_PROFILE);
  }, []);

  const setGoal = useCallback((goal: GoalType) => {
    setProfile((prev) => ({ ...prev, goal }));
  }, []);

  const setSex = useCallback((sex: SexType) => {
    setProfile((prev) => ({ ...prev, sex }));
  }, []);

  const setWeight = useCallback((weight: number) => {
    setProfile((prev) => ({ ...prev, weight }));
  }, []);

  const toggleFavoriteDrink = useCallback((drinkId: string) => {
    setProfile((prev) => {
      const isSelected = prev.favoriteDrinks.includes(drinkId);
      return {
        ...prev,
        favoriteDrinks: isSelected
          ? prev.favoriteDrinks.filter((id) => id !== drinkId)
          : [...prev.favoriteDrinks, drinkId],
      };
    });
  }, []);

  return {
    profile,
    hasCompleted,
    isLoading,
    updateProfile,
    complete,
    reset,
    setGoal,
    setSex,
    setWeight,
    toggleFavoriteDrink,
  };
}
