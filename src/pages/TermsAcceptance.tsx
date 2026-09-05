import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export function TermsAcceptance() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ terms_accepted: true })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      await refreshProfile();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to accept terms.');
      setLoading(false);
    }
  };

  return (
    <Layout style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4 }}
        style={{ width: '80px', height: '80px', borderRadius: '40px', backgroundColor: 'var(--grove-moss-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}
      >
        <ShieldCheck size={40} color="var(--grove-moss)" />
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '16px', textAlign: 'center', color: 'var(--ink-base)' }}>
          Privacy & Terms
        </h1>
        
        <p style={{ color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: '32px', lineHeight: 1.6, maxWidth: '400px' }}>
          Articulate uses Artificial Intelligence to listen to your practice sessions and provide coaching feedback. By proceeding, you agree to our Terms of Service and acknowledge that your voice data may be processed to improve your speaking skills.
        </p>

        {error && <div style={{ color: 'var(--error-brick)', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
        
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button variant="primary" style={{ width: '100%', padding: '16px 0', borderRadius: '12px' }} onClick={handleAccept} disabled={loading}>
            {loading ? 'Saving...' : 'I Accept'}
          </Button>
          <Button variant="secondary" style={{ width: '100%', padding: '16px 0', borderRadius: '12px', color: 'var(--ink-primary)' }} onClick={() => supabase.auth.signOut()}>
            Sign Out
          </Button>
        </div>
      </motion.div>
    </Layout>
  );
}
