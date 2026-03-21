import React from 'react';
import { AnimatePresence } from 'framer-motion';
import GoalSuccessModal from './GoalSuccessModal';

export default function GoalSuccessModalHost({ flow, onClose, onOpenGoalDetails }) {
  return (
    <AnimatePresence>
      {flow ? (
        <GoalSuccessModal
          flow={flow}
          onClose={onClose}
          onOpenGoalDetails={onOpenGoalDetails}
        />
      ) : null}
    </AnimatePresence>
  );
}
