import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Layout } from '@/components/layout/Layout';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { HomePage } from '@/pages/HomePage';
import { SupportChatWidget } from '@/components/support/SupportChatWidget';
import { AdminImpersonationBanner } from '@/components/layout/AdminImpersonationBanner';
import { ContentMediaProtection } from '@/components/ContentMediaProtection';
import { DemoModeSwitcher } from '@/components/auth/DemoModeSwitcher';

const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const ArticlePage = lazy(() => import('@/pages/ArticlePage').then((module) => ({ default: module.ArticlePage })));
const CommunityPage = lazy(() => import('@/pages/CommunityPage').then((module) => ({ default: module.CommunityPage })));
const CommunityCreatePage = lazy(() => import('@/pages/CommunityCreatePage').then((module) => ({ default: module.CommunityCreatePage })));
const CommunityPostPage = lazy(() => import('@/pages/CommunityPostPage').then((module) => ({ default: module.CommunityPostPage })));
const BuyerDashboardPage = lazy(() => import('@/pages/BuyerDashboardPage').then((module) => ({ default: module.BuyerDashboardPage })));
const ParentDashboardPage = lazy(() => import('@/pages/ParentDashboardPage').then((module) => ({ default: module.ParentDashboardPage })));
const ServicesPage = lazy(() => import('@/pages/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const ChatPage = lazy(() => import('@/pages/Chat').then((module) => ({ default: module.ChatPage })));
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const CompleteGoogleProfilePage = lazy(() => import('@/pages/CompleteGoogleProfilePage').then((module) => ({ default: module.CompleteGoogleProfilePage })));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then((module) => ({ default: module.FavoritesPage })));
const GuidePage = lazy(() => import('@/pages/GuidePage').then((module) => ({ default: module.GuidePage })));
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage').then((module) => ({ default: module.OAuthCallbackPage })));
const ParentVerifyPage = lazy(() => import('@/pages/ParentVerifyPage').then((module) => ({ default: module.ParentVerifyPage })));
const FreelancerDashboardPage = lazy(() => import('@/pages/FreelancerDashboardPage').then((module) => ({ default: module.FreelancerDashboardPage })));
const FreelancerProfilePage = lazy(() => import('@/pages/FreelancerProfilePage').then((module) => ({ default: module.FreelancerProfilePage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const TermsPage = lazy(() => import('@/pages/TermsPage').then((module) => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));

const RouteLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-slate-950 px-4" role="status" aria-live="polite">
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-brand-950 px-6 py-5 text-white shadow-2xl">
      <span className="relative flex size-11 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-amber-300/20 border-t-amber-300" />
        <span className="size-2.5 rounded-full bg-brand-400" />
      </span>
      <span className="text-sm font-bold">جارٍ تحميل الصفحة...</span>
    </div>
  </div>
);

const PendingAccountRouteGuard = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isWaitingForVerification = user?.role === 'Freelancer' && user.accountStatus !== 'ACTIVE';
  const isVerificationFlow = location.pathname.startsWith('/parent-verify/');
  const isCompletingSignup = location.pathname === '/complete-profile' && !user?.profileComplete;

  const isImpersonating = typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('mabdeen_admin_token_backup'));
  if (!isLoading && !isImpersonating && isWaitingForVerification && location.pathname !== '/' && !isVerificationFlow && !isCompletingSignup) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <ContentMediaProtection />
          <AuthProvider>
            <ToastProvider>
              <ScrollToTop />
              <AdminImpersonationBanner />
              <DemoModeSwitcher />
              <PendingAccountRouteGuard>
                <Suspense fallback={<RouteLoading />}>
                <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />
                <Route path="/auth/github/callback" element={<OAuthCallbackPage />} />
                <Route path="/complete-profile" element={<CompleteGoogleProfilePage />} />
                <Route path="/parent-verify/:token" element={<ParentVerifyPage />} />

                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="/blog" element={<Navigate to="/community" replace />} />
                  <Route path="/blog/:slug" element={<ArticlePage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/community/create" element={<ProtectedRoute><CommunityCreatePage /></ProtectedRoute>} />
                  <Route path="/community/posts/:id" element={<CommunityPostPage />} />
                  <Route path="/freelancers/:id" element={<FreelancerProfilePage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/guide" element={<GuidePage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute allowedRoles={['Freelancer', 'Buyer']}>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/orders" element={<ProtectedRoute allowedRoles={['Freelancer', 'Buyer']}><OrdersPage /></ProtectedRoute>} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['Freelancer']}>
                        <FreelancerDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/buyer"
                    element={
                      <ProtectedRoute allowedRoles={['Buyer']}>
                        <BuyerDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/parent" element={<ProtectedRoute allowedRoles={['Parent']}><ParentDashboardPage /></ProtectedRoute>} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                </Routes>
                </Suspense>
              </PendingAccountRouteGuard>
              <SupportChatWidget />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
