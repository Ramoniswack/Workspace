'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DeleteZoneProps {
  isVisible: boolean;
  isOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}

export function DeleteZone({ isVisible, isOver, onDrop, onDragOver, onDragLeave }: DeleteZoneProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            animate={{
              scale: isOver ? 1.2 : 1,
              backgroundColor: isOver ? 'rgb(239, 68, 68)' : 'rgba(239, 68, 68, 0.1)',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className={`
              flex items-center justify-center w-16 h-16 rounded-full
              border-2 border-red-500 backdrop-blur-sm
              ${isOver ? 'shadow-2xl shadow-red-500/50' : 'shadow-lg'}
            `}
          >
            <motion.div
              animate={{
                scale: isOver ? 1.3 : 1,
                rotate: isOver ? [0, -10, 10, -10, 10, 0] : 0,
              }}
              transition={{
                scale: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                },
                rotate: {
                  duration: 0.5,
                  ease: 'easeInOut',
                },
              }}
            >
              <Trash2 className={`w-7 h-7 ${isOver ? 'text-white' : 'text-red-500'}`} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
