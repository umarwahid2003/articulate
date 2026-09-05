import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ArticulateLogo } from '../components/ArticulateLogo';
import { motion } from 'framer-motion';

export function SignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <Layout style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '160px', backgroundImage: 'radial-gradient(circle at top, rgba(31, 122, 108, 0.15) 0%, transparent 60%)' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', transform: 'translateY(10px)' }}
      >
        <div style={{
          filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.12))'
        }}>
          <ArticulateLogo size={80} />
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '48px' }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', marginBottom: '8px', color: 'var(--ink-base)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Speak with confidence
          </h1>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '18px' }}>Join Articulate to start practicing.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div style={{ color: 'var(--error-brick)', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
          
          <button 
            onClick={handleGoogleSignUp}
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '18px', 
              borderRadius: '100px', 
              backgroundColor: '#FFFFFF', 
              border: 'none',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              fontSize: '18px',
              fontWeight: 600,
              color: '#000000',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              opacity: loading ? 0.7 : 1,
            }} 
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.72 17.57V20.34H19.29C21.37 18.42 22.56 15.58 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.72 17.57C14.73 18.23 13.47 18.63 12 18.63C9.16 18.63 6.76 16.71 5.88 14.15H2.21V16.99C4.02 20.58 7.73 23 12 23Z" fill="#34A853"/>
              <path d="M5.88 14.15C5.66 13.48 5.53 12.76 5.53 12C5.53 11.24 5.66 10.52 5.88 9.85V7.01H2.21C1.46 8.5 1 10.2 1 12C1 13.8 1.46 15.5 2.21 16.99L5.88 14.15Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.37 3.85C17.45 2.06 14.96 1 12 1C7.73 1 4.02 3.42 2.21 7.01L5.88 9.85C6.76 7.29 9.16 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>
        
        <div style={{ textAlign: 'center', fontSize: '15px', color: 'var(--ink-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--grove-moss)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </div>
      </motion.div>
    </Layout>
  );
}
