import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
import { Practice } from './pages/Practice';
import { Progress } from './pages/Progress';
import { Profile } from './pages/Profile';
import { AccountDetails } from './pages/AccountDetails';
import { CoachContext } from './pages/CoachContext';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { TermsAcceptance } from './pages/TermsAcceptance';
import GroveOrb from './components/GroveOrb';
import { BottomNavigation } from './components/BottomNavigation';
import { PracticeSheet } from './components/PracticeSheet';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';

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
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'var(--surface-base)', 
        color: 'var(--grove-moss)', 
        fontFamily: 'var(--font-display)', 
        fontSize: '18px',
        fontWeight: 600
      }}>
        Articulate...
      </div>
    );
  }

  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/onboarding" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Onboarding />
          </motion.div>
        } />
        
        <Route path="/login" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Login />
          </motion.div>
        } />
        <Route path="/signup" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Home />
            </motion.div>
          } />
          <Route path="/practice" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Practice />
            </motion.div>
          } />
          <Route path="/context" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <CoachContext />
            </motion.div>
          } />
          <Route path="/progress" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Progress />
            </motion.div>
          } />
          <Route path="/profile" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Profile />
            </motion.div>
          } />
          <Route path="/account-details" element={
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AccountDetails />
            </motion.div>
          } />
        </Route>
        
        <Route path="/preview" element={<div style={{height: '100vh', width: '100vw'}}><GroveOrb showControls={true} /></div>} />
      </Routes>
    </AnimatePresence>
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