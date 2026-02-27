import api from './api';

export interface OnboardingProgress {
  id: number;
  userId: number;
  currentStep: number;
  completedSteps: number[];
  isComplete: boolean;
  skippedAt: string | null;
  completedAt: string | null;
}

export const onboardingApi = {
  getProgress: () => api.get<OnboardingProgress>('/users/onboarding'),
  advanceStep: (step: number) =>
    api.post<OnboardingProgress>('/users/onboarding/advance', { step }),
  skip: () => api.post<OnboardingProgress>('/users/onboarding/skip'),
  reset: () => api.post<OnboardingProgress>('/users/onboarding/reset'),
};
