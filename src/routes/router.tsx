import { createBrowserRouter, Outlet } from 'react-router';
import { BASE_PATH } from '@/lib/env';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { IntimacyPage } from '@/pages/IntimacyPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PartnerPage } from '@/pages/PartnerPage';
import { PeriodsPage } from '@/pages/PeriodsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SymptomsPage } from '@/pages/SymptomsPage';
import { AuthenticatedApp } from './AuthenticatedApp';
import { InsightsPage } from './lazyPages';
import { ProtectedRoute, PublicOnlyRoute } from './guards';

export const routes = [
  {
    element: <Outlet />,
    children: [
      { path: '/login', element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
      { path: '/signup', element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute> },
      { path: '/forgot-password', element: <PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute> },
      { path: '/verify-email', element: <PublicOnlyRoute><VerifyEmailPage /></PublicOnlyRoute> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      {
        element: (
          <ProtectedRoute>
            <AuthenticatedApp />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'intimacy', element: <IntimacyPage /> },
          { path: 'insights', element: <InsightsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'periods', element: <PeriodsPage /> },
          { path: 'symptoms', element: <SymptomsPage /> },
          { path: 'partner', element: <PartnerPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  // Serve under the build base path (e.g. /lunelle on GitHub Pages).
  return createBrowserRouter(routes, { basename: BASE_PATH || '/' });
}
