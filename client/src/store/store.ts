import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';
import reportsReducer from './reportsSlice';
import notificationsReducer from './notificationsSlice';
import searchReducer from './searchSlice';
import onboardingReducer from './onboardingSlice';
import webhooksReducer from './webhooksSlice';
import templatesReducer from './templatesSlice';
import schedulesReducer from './schedulesSlice';
import recommendationsReducer from './recommendationsSlice';
import adaptiveReducer from './adaptiveSlice';
import agentsReducer from './agentsSlice';
import complianceReducer from './complianceSlice';
import registryReducer from './registrySlice';
import orchestratorReducer from './orchestratorSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    reports: reportsReducer,
    notifications: notificationsReducer,
    search: searchReducer,
    onboarding: onboardingReducer,
    webhooks: webhooksReducer,
    templates: templatesReducer,
    schedules: schedulesReducer,
    recommendations: recommendationsReducer,
    adaptive: adaptiveReducer,
    agents: agentsReducer,
    compliance: complianceReducer,
    registry: registryReducer,
    orchestrator: orchestratorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
