import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { account, databases, DATABASE_ID, COLLECTION_USERS, ID, Query } from "@/lib/appwrite";
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

async function isFirstUser(): Promise<boolean> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_USERS,
      [Query.limit(1)]
    );
    return response.documents.length === 0;
  } catch (error) {
    console.error("[isFirstUser] Failed to check users collection — does it exist?", error);
    return true;
  }
}

async function fetchOrCreateUserProfile(accountUser: { $id: string; name: string; email: string }): Promise<User> {
  console.log("[fetchOrCreateUserProfile] Auth user ID:", accountUser.$id);

  if (!accountUser.$id) {
    console.error("[fetchOrCreateUserProfile] CRITICAL: accountUser.$id is missing!");
    throw new Error("Auth user ID is missing — cannot link profile document");
  }

  // 1. Try to read existing profile
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_USERS, accountUser.$id);
    console.log("[fetchOrCreateUserProfile] Found existing profile, role:", doc.role);
    
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
  } catch (readError) {
    console.log("[fetchOrCreateUserProfile] No profile found, creating new one...");
    
    // 2. Determine role (first user = admin)
    const firstUser = await isFirstUser();
    const assignedRole: UserRole = firstUser ? "admin" : "viewer";
    console.log("[fetchOrCreateUserProfile] Assigning role:", assignedRole, "(firstUser:", firstUser, ")");

    // 3. Create profile document
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_USERS,
        accountUser.$id, // Same ID as Auth user!
        {
          name: accountUser.name,
          email: accountUser.email,
          role: assignedRole,
          preferences: JSON.stringify({
            default_map_view: false,
            favorite_sources: ["immoweb", "immovlan", "zimmo"],
          }),
          created_at: new Date().toISOString(),
        }
      );
      console.log("[fetchOrCreateUserProfile] Profile created successfully with ID:", accountUser.$id);
    } catch (createError) {
      console.error("[fetchOrCreateUserProfile] FAILED to create profile document:", createError);
      console.error("→ This usually means the 'users' collection does not exist in Appwrite Console");
    }

    return {
      $id: accountUser.$id,
      name: accountUser.name,
      email: accountUser.email,
      role: assignedRole,
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
      console.log("[useAuth] Logged in as:", appwriteUser.$id, appwriteUser.name);
      
      const profile = await fetchOrCreateUserProfile(appwriteUser);
      console.log("[useAuth] Profile loaded, role:", profile.role);
      
      setUser(profile);
      setIsAuthenticated(true);
    } catch (error) {
      console.log("[useAuth] Not authenticated");
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
      console.log("[register] Auth account created:", accountUser.$id);
      
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