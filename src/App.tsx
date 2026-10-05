import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { env } from '@/lib/env';
import { ConfigErrorPage } from '@/pages/ConfigErrorPage';
import { createAppRouter } from '@/routes/router';

export function App() {
  const [router] = useState(createAppRouter);

  if (!env.isSupabaseConfigured) return <ConfigErrorPage />;

  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
