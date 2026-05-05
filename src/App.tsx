import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeJobs, useRealtimeProperties, useRealtimeLogs } from "@/hooks/useRealtime";
import Index from "./pages/Index";
import PropertyDetail from "./pages/PropertyDetail";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Route wrapper - requires admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public Route wrapper (redirects to home if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Realtime subscriptions component (mounts once in the app tree)
function RealtimeSubscriptions() {
  useRealtimeJobs();
  useRealtimeProperties();
  useRealtimeLogs();
  return null;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    
    {/* Protected routes */}
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/properties" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    
    {/* Admin-only routes */}
    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
    <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
    
    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RealtimeSubscriptions />
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;