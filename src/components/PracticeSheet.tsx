import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Mic, Target } from 'lucide-react';
import { Card } from './Card';
import './PracticeSheet.css';

interface PracticeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PracticeSheet = ({ isOpen, onClose }: PracticeSheetProps) => {
  const navigate = useNavigate();

  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            className="practice-sheet-overlay"
          />
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            transition={isDesktop ? { duration: 0.2 } : { type: 'spring', damping: 25, stiffness: 200 }}
            className="practice-sheet-container"
          >
            <div className="practice-sheet-handle" />
            
            <h3 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', marginBottom: '16px', textAlign: 'center' }}>
              How would you like to practice?
            </h3>
            
            <Card 
              size="standard"
              title="Suggest a Topic"
              subtitle="Let Articulate AI generate a tailored topic and start speaking right away."
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
              onClick={() => handleSelectOption('/practice', { autoSuggest: false })}
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
