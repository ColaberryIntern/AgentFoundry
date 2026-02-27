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

// Backend wraps the progress object: { progress: OnboardingProgress }
interface OnboardingResponse {
  progress: OnboardingProgress;
}

export const onboardingApi = {
  getProgress: () =>
    api.get<OnboardingResponse>('/users/onboarding').then((res) => res.data.progress),
  advanceStep: (step: number) =>
    api
      .post<OnboardingResponse>('/users/onboarding/advance', { step })
      .then((res) => res.data.progress),
  skip: () =>
    api.post<OnboardingResponse>('/users/onboarding/skip').then((res) => res.data.progress),
  reset: () =>
    api.post<OnboardingResponse>('/users/onboarding/reset').then((res) => res.data.progress),
};
