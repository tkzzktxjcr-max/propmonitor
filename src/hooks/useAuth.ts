import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { account, ID } from "@/lib/appwrite";
import type { User, UserRole } from "@/types";

// Default user for demo/fallback
const defaultUser: User = {
  $id: "default",
  name: "Admin User",
  email: "admin@belrealty.be",
  role: "admin",
  preferences: {
    default_map_view: false,
    favorite_sources: ["immoweb", "immovlan", "zimmo"]
  },
  created_at: new Date().toISOString()
};

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const appwriteUser = await account.get();
      setUser({
        $id: appwriteUser.$id,
        name: appwriteUser.name,
        email: appwriteUser.email,
        role: "admin", // Default role, could be fetched from user attributes
        preferences: {
          default_map_view: false,
          favorite_sources: ["immoweb", "immovlan", "zimmo"]
        },
        created_at: appwriteUser.$createdAt
      });
      setIsAuthenticated(true);
    } catch (error) {
      // Not logged in
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      await checkAuth();
      return user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      await checkAuth();
      return user;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }, []);

  const isAdmin = user?.role === "admin";

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    login,
    register,
    logout,
    checkAuth
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { checkAuth } = useAuth();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await account.createEmailPasswordSession(email, password);
      await checkAuth();
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const { checkAuth } = useAuth();

  return useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      await checkAuth();
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await account.deleteSession("current");
      return true;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useRequireAuth() {
  const { isAuthenticated, user, isLoading } = useAuth();

  return { isAuthenticated, user, isLoading };
}

export function useRequireRole(requiredRole: UserRole) {
  const { user, isAdmin } = useAuth();

  const hasRole = requiredRole === "admin" ? isAdmin : !!user;

  return { hasRole, user };
}