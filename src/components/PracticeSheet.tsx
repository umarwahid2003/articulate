import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Mic, Target } from 'lucide-react';
import { Card } from './Card';

interface PracticeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PracticeSheet = ({ isOpen, onClose }: PracticeSheetProps) => {
  const navigate = useNavigate();

  const handleSelectOption = (path: string, state?: any) => {
    onClose();
    navigate(path, { state });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 200
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              backgroundColor: 'var(--surface-raised)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '32px 24px 80px',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-strong)', borderRadius: '2px', margin: '0 auto 16px' }} />
            
            <h3 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', marginBottom: '16px', textAlign: 'center' }}>
              How would you like to practice?
            </h3>
            
            <Card 
              size="standard"
              title="Suggest a Topic"
              subtitle="Let Grove AI generate a tailored topic and start speaking right away."
              interactive
              onClick={() => handleSelectOption('/practice', { autoSuggest: true })}
              media={
                <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(31, 122, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={24} color="var(--grove-moss)" />
                </div>
              }
              style={{ backgroundColor: 'var(--surface-base)' }}
            />

            <Card 
              size="standard"
              title="Free-Form Speaking"
              subtitle="Speak about anything on your mind with instant text feedback."
              interactive
              onClick={() => handleSelectOption('/practice')}
              media={
                <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(31, 122, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={24} color="var(--grove-moss)" />
                </div>
              }
              style={{ backgroundColor: 'var(--surface-base)' }}
            />

            <Card 
              size="standard"
              title="Update Speaking Goals"
              subtitle="Refine your context, level, and interests."
              interactive
              onClick={() => handleSelectOption('/onboarding')}
              media={
                <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(31, 122, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={24} color="var(--grove-moss)" />
                </div>
              }
              style={{ backgroundColor: 'var(--surface-base)' }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
