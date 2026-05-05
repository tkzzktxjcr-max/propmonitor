import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { account, databases, DATABASE_ID, COLLECTION_USERS, ID } from "@/lib/appwrite";
import type { User, UserRole } from "@/types";

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

async function fetchOrCreateUserProfile(accountUser: { $id: string; name: string; email: string }): Promise<User> {
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, accountUser.$id);
    return {
      $id: doc.$id,
      name: doc.name || accountUser.name,
      email: doc.email || accountUser.email,
      role: (doc.role as UserRole) || "viewer",
      preferences: typeof doc.preferences === "string"
        ? JSON.parse(doc.preferences)
        : doc.preferences || { default_map_view: false, favorite_sources: ["immoweb", "immovlan", "zimmo"] },
      created_at: doc.created_at || new Date().toISOString(),
    };
  } catch {
    // Document doesn't exist yet — create it with viewer role
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_USERS,
        accountUser.$id,
        {
          name: accountUser.name,
          email: accountUser.email,
          role: "viewer",
          preferences: JSON.stringify({
            default_map_view: false,
            favorite_sources: ["immoweb", "immovlan", "zimmo"],
          }),
          created_at: new Date().toISOString(),
        }
      );
    } catch (createError) {
      console.warn("[useAuth] Could not create user profile document:", createError);
    }

    return {
      $id: accountUser.$id,
      name: accountUser.name,
      email: accountUser.email,
      role: "viewer",
      preferences: {
        default_map_view: false,
        favorite_sources: ["immoweb", "immovlan", "zimmo"],
      },
      created_at: new Date().toISOString(),
    };
  }
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const appwriteUser = await account.get();
      const profile = await fetchOrCreateUserProfile(appwriteUser);
      setUser(profile);
      setIsAuthenticated(true);
    } catch {
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
      const accountUser = await account.create(ID.unique(), email, password, name);
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

  return {
    mutateAsync: async ({ email, password }: { email: string; password: string }) => {
      await account.createEmailPasswordSession(email, password);
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["user"] });
      return true;
    },
    isPending: false,
  };
}

export function useRegister() {
  const queryClient = useQueryClient();
  const { checkAuth } = useAuth();

  return {
    mutateAsync: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const accountUser = await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["user"] });
      return true;
    },
    isPending: false,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async () => {
      await account.deleteSession("current");
      queryClient.clear();
      return true;
    },
    isPending: false,
  };
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