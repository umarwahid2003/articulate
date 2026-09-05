import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation } from './components/BottomNavigation';
import { PracticeSheet } from './components/PracticeSheet';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';

// Lazy load route pages for high-speed bundle splitting
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Practice = lazy(() => import('./pages/Practice').then(m => ({ default: m.Practice })));
const Progress = lazy(() => import('./pages/Progress').then(m => ({ default: m.Progress })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const AccountDetails = lazy(() => import('./pages/AccountDetails').then(m => ({ default: m.AccountDetails })));
const CoachContext = lazy(() => import('./pages/CoachContext').then(m => ({ default: m.CoachContext })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const TermsAcceptance = lazy(() => import('./pages/TermsAcceptance').then(m => ({ default: m.TermsAcceptance })));

const PageLoader = () => (
  <div style={{ 
    height: '100dvh', 
    minHeight: '100vh',
    width: '100%', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'var(--surface-base)', 
    gap: '12px'
  }}>
    <div style={{
      color: 'var(--grove-moss)', 
      fontFamily: 'var(--font-display)', 
      fontSize: '22px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      animation: 'animate-pulse 1.8s ease-in-out infinite'
    }}>
      Articulate
    </div>
    <div style={{
      width: '28px',
      height: '2px',
      borderRadius: '2px',
      backgroundColor: 'var(--grove-moss)',
      opacity: 0.3,
      animation: 'animate-pulse 1.8s ease-in-out infinite'
    }} />
  </div>
);

const Shell = () => {
  const [isPracticeSheetOpen, setIsPracticeSheetOpen] = useState(false);

  return (
    <>
      <Outlet context={{ openPracticeSheet: () => setIsPracticeSheetOpen(true) }} />
      <BottomNavigation onOpenPractice={() => setIsPracticeSheetOpen(true)} />
      <PracticeSheet isOpen={isPracticeSheetOpen} onClose={() => setIsPracticeSheetOpen(false)} />
    </>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;

    if (isSupabaseConfigured) {
      if (!user) {
        navigate('/login', { state: { from: location }, replace: true });
        return;
      }
      if (profile && !profile.terms_accepted && location.pathname !== '/terms') {
        navigate('/terms', { replace: true });
        return;
      }
    }

    const hasOnboarded = localStorage.getItem('grove_user_context');
    if (!hasOnboarded && location.pathname !== '/onboarding' && location.pathname !== '/login' && location.pathname !== '/signup') {
      navigate('/onboarding', { replace: true });
    }
  }, [user, profile, loading, location, navigate]);

  if (loading) {
    return <PageLoader />;
  }

  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/onboarding" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Onboarding />
            </motion.div>
          } />
          
          <Route path="/login" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Login />
            </motion.div>
          } />
          <Route path="/signup" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <SignUp />
            </motion.div>
          } />
          
          <Route path="/terms" element={
            <ProtectedRoute>
              <TermsAcceptance />
            </ProtectedRoute>
          } />
          
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route path="/" element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <Home />
              </motion.div>
            } />
            <Route path="/practice" element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <Practice />
              </motion.div>
            } />
            <Route path="/context" element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <CoachContext />
              </motion.div>
            } />
            <Route path="/progress" element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <Progress />
              </motion.div>
            } />
            <Route path="/profile" element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <Profile />
              </motion.div>
            } />
            <Route path="/account-details" element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <AccountDetails />
              </motion.div>
            } />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;