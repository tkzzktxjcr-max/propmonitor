import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { account } from "@/lib/appwrite";
import type { User, UserRole } from "@/types";

// Mock user for demo
const mockUser: User = {
  $id: "user-1",
  name: "Admin User",
  email: "admin@realestate.be",
  role: "admin",
  preferences: {
    default_map_view: false,
    favorite_sources: ["immoweb", "immovlan", "zimmo"]
  },
  created_at: "2024-01-01T00:00:00Z"
};

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Demo: start authenticated
  const [user, setUser] = useState<User | null>(mockUser);
  
  const login = useCallback(async (email: string, password: string) => {
    // In production, this would use Appwrite Auth
    // await account.createEmailPasswordSession(email, password);
    console.log("Logging in:", email);
    
    // Demo: accept any credentials
    setUser(mockUser);
    setIsAuthenticated(true);
    return mockUser;
  }, []);
  
  const logout = useCallback(async () => {
    // In production, this would use Appwrite Auth
    // await account.deleteSession("current");
    console.log("Logging out");
    
    setUser(null);
    setIsAuthenticated(false);
  }, []);
  
  const isAdmin = user?.role === "admin";
  
  return {
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // In production, this would call Appwrite Auth
      console.log("Login attempt:", email);
      
      // Demo: accept any credentials
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useRequireAuth() {
  const { isAuthenticated, user } = useAuth();
  
  // In a real app, this would redirect to login
  if (!isAuthenticated) {
    console.warn("User not authenticated");
  }
  
  return { isAuthenticated, user };
}

export function useRequireRole(requiredRole: UserRole) {
  const { user, isAdmin } = useAuth();
  
  const hasRole = requiredRole === "admin" ? isAdmin : !!user;
  
  if (!hasRole) {
    console.warn(`User does not have required role: ${requiredRole}`);
  }
  
  return { hasRole, user };
}
