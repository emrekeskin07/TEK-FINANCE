import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const ONBOARDING_SKIPPED_STORAGE_KEY = 'onboarding_skipped';

export function useOnboardingManager({
  authUser,
  isPortfolioLoading,
  portfolio,
  loadUserPreferences,
  saveUserPreferences,
  setInsightTone,
  triggerCelebration,
  navigate,
}) {
  const [onboardingState, setOnboardingState] = useState({
    loading: true,
    saving: false,
    hasCompleted: false,
    hasPreferenceRecord: false,
    riskProfile: '',
  });
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const skipped = window.localStorage.getItem(ONBOARDING_SKIPPED_STORAGE_KEY) === 'true';
    setHasSkippedOnboarding(skipped);
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser?.id) {
      setOnboardingState({
        loading: false,
        saving: false,
        hasCompleted: false,
        hasPreferenceRecord: false,
        riskProfile: '',
      });
      return;
    }

    let isDisposed = false;

    const loadOnboardingState = async () => {
      setOnboardingState((prev) => ({ ...prev, loading: true }));

      try {
        const data = await loadUserPreferences();

        if (isDisposed) {
          return;
        }

        setOnboardingState((prev) => ({
          ...prev,
          loading: false,
          hasCompleted: Boolean(data?.hasCompleted),
          hasPreferenceRecord: Boolean(data?.hasPreferenceRecord),
          riskProfile: String(data?.riskProfile || ''),
        }));

        if (data?.hasCompleted && String(data?.riskProfile || '') === 'conservative') {
          if (setInsightTone) setInsightTone('neutral');
        }
      } catch (error) {
        console.warn('user_preferences okunamadi:', error?.message || error);
        setOnboardingState((prev) => ({
          ...prev,
          loading: false,
          hasCompleted: false,
          hasPreferenceRecord: false,
          riskProfile: '',
        }));
      }
    };

    loadOnboardingState();

    return () => {
      isDisposed = true;
    };
  }, [authUser?.id, loadUserPreferences, setInsightTone]);

  const shouldShowOnboarding = Boolean(authUser)
    && !onboardingState.loading
    && !isPortfolioLoading
    && !onboardingState.hasCompleted
    && !hasSkippedOnboarding
    && (portfolio.length === 0 || !onboardingState.hasPreferenceRecord);

  const handleCompleteOnboarding = useCallback(async ({ interests, riskProfile, firstAssetCommand }) => {
    if (!authUser?.id) {
      toast.error('Kurulum ayarlari kaydedilemedi.');
      return;
    }

    setOnboardingState((prev) => ({ ...prev, saving: true }));

    let payload;
    try {
      payload = await saveUserPreferences({ interests, riskProfile, firstAssetCommand });
    } catch {
      toast.error('Kurulum tercihleri kaydedilemedi.');
      setOnboardingState((prev) => ({ ...prev, saving: false }));
      return;
    }

    if (payload.risk_profile === 'conservative') {
      if (setInsightTone) setInsightTone('neutral');
    } else {
      if (setInsightTone) setInsightTone('coaching');
    }

    setOnboardingState((prev) => ({
      ...prev,
      saving: false,
      hasCompleted: true,
      hasPreferenceRecord: true,
      riskProfile: String(payload.risk_profile || ''),
    }));

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ONBOARDING_SKIPPED_STORAGE_KEY);
    }
    setHasSkippedOnboarding(false);

    if (navigate) navigate('/');
    if (triggerCelebration) triggerCelebration();
    toast.success('Kurulum tamamlandı. Hoş geldin!');
  }, [authUser?.id, saveUserPreferences, setInsightTone, navigate, triggerCelebration]);

  const handleSkipOnboarding = useCallback(() => {
    if (typeof window === 'undefined') {
      window.localStorage.setItem(ONBOARDING_SKIPPED_STORAGE_KEY, 'true');
    }

    setHasSkippedOnboarding(true);
    toast('Kurulum simdilik ertelendi.');
  }, []);

  return {
    onboardingState,
    shouldShowOnboarding,
    handleCompleteOnboarding,
    handleSkipOnboarding,
  };
}
