import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 800); // Wait for fade out animation
    }, 2800); // Show for 2.8 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.05,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden"
        >
          {/* Subtle Background Pattern (Trong Dong) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }} /* Slightly more opacity for the yellow pattern */
            transition={{ duration: 2 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'url("/trong-dong-dong-son.png")',
              backgroundSize: '1000px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Animated Soft Glow Effect (Subtle for light mode) */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fpt-orange/5 blur-[120px] rounded-full pointer-events-none"
          />

          {/* Logo Container */}
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 22,
                delay: 0.2
              }}
              className="mb-8"
            >
              <img
                src="/fams-logo.png"
                alt="FAMS Logo"
                className="h-28 w-auto object-contain"
              />
            </motion.div>

            {/* Text Animations */}
            <div className="flex flex-col items-center space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 uppercase"
              >
                FAMS
              </motion.h1>

              <div className="h-[3px] w-14 bg-fpt-orange rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 0.4
                  }}
                  className="w-full h-full bg-white/60"
                />
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1, duration: 1 }}
                className="text-sm font-semibold tracking-[0.4em] text-zinc-600 uppercase mt-5"
              >
                Academic Management System
              </motion.p>
            </div>
          </div>

          {/* Bottom Progress Indicator */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-56">
            <div className="h-[2px] w-full bg-zinc-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.8, ease: "easeInOut" }}
                className="h-full bg-fpt-orange shadow-[0_0_10px_rgba(242,111,33,0.3)]"
              />
            </div>
          </div>

          {/* Grain Overlay for Premium Texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
