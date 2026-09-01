import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { WellnessPlan } from '../../types';
import { AppUser } from './useAuth';
import { logger } from '../logger';

export function useWellnessPlan(user: AppUser) {
  const [plan, setPlan] = useState<Partial<WellnessPlan>>({});

  useEffect(() => {
    if (!user) {
      setPlan({});
      return;
    }

    if ('isMock' in user && user.isMock) {
      const handleStorage = () => {
        try {
          const raw = localStorage.getItem(`dean_tracker_wellness_plan_${user.uid}`);
          if (raw) {
            setPlan(JSON.parse(raw));
          }
        } catch (error) {
          logger.error('Failed to parse mock plan from storage:', error);
        }
      };

      handleStorage();
      window.addEventListener('storage', handleStorage);
      // Custom event for same-window updates
      window.addEventListener('planUpdated', handleStorage);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('planUpdated', handleStorage);
      };
    } else {
      const unsubscribe = onSnapshot(
        doc(db, 'wellnessPlans', user.uid),
        (snap) => {
          if (snap.exists()) {
            setPlan(snap.data() as WellnessPlan);
          } else {
            setPlan({});
          }
        },
        (error) => {
          logger.error('Error fetching wellness plan:', error);
        }
      );
      
      return () => unsubscribe();
    }
  }, [user]);

  return { plan };
}
