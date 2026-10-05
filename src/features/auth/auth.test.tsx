import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/guards';
import { createFakeAuthService, fakeSession } from '@/test/fakeAuthService';
import { AuthProvider } from './AuthProvider';

function renderApp(path: string, fake = createFakeAuthService()) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
      { path: '/signup', element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute> },
      { path: '/verify-email', element: <PublicOnlyRoute><VerifyEmailPage /></PublicOnlyRoute> },
      { path: '/forgot-password', element: <PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/settings', element: <ProtectedRoute><h1>Settings area</h1></ProtectedRoute> },
      { path: '/', element: <ProtectedRoute><h1>Private dashboard</h1></ProtectedRoute> },
      { path: '/calendar', element: <ProtectedRoute><h1>Private calendar</h1></ProtectedRoute> },
    ],
    { initialEntries: [path] },
  );
  render(
    <ToastProvider>
      <AuthProvider service={fake.service}>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>,
  );
  return { ...fake, router, user: userEvent.setup() };
}

describe('protected routes', () => {
  it('redirects unauthenticated visitors to sign-in and never renders private content', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('shows private content to signed-in users', async () => {
    renderApp('/', createFakeAuthService(fakeSession()));
    expect(await screen.findByText('Private dashboard')).toBeInTheDocument();
  });

  it('returns users to the page they originally requested after signing in', async () => {
    const { user, service } = renderApp('/calendar');
    await screen.findByRole('heading', { name: 'Welcome back' });
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(service.signIn).toHaveBeenCalledWith('sam@example.com', 'correct-horse');
    expect(await screen.findByText('Private calendar')).toBeInTheDocument();
  });

  it('sends users away from the sign-in page when already signed in', async () => {
    renderApp('/login', createFakeAuthService(fakeSession()));
    expect(await screen.findByText('Private dashboard')).toBeInTheDocument();
  });

  it('locks private content again after sign-out', async () => {
    const { emit } = renderApp('/', createFakeAuthService(fakeSession()));
    await screen.findByText('Private dashboard');
    emit('SIGNED_OUT', null);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });
});

describe('login', () => {
  it('validates the form before calling the server', async () => {
    const { user, service } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(service.signIn).not.toHaveBeenCalled();
  });

  it('shows a friendly message for wrong credentials', async () => {
    const fake = createFakeAuthService();
    fake.service.signIn.mockRejectedValueOnce(
      Object.assign(new Error('Invalid login credentials'), { name: 'AuthApiError' }),
    );
    const { user } = renderApp('/login', fake);
    await user.type(await screen.findByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('The email or password is incorrect.')).toBeInTheDocument();
  });

  it('offers to resend verification for unconfirmed emails', async () => {
    const fake = createFakeAuthService();
    fake.service.signIn.mockRejectedValueOnce(
      Object.assign(new Error('Email not confirmed'), { name: 'AuthApiError' }),
    );
    const { user } = renderApp('/login', fake);
    await user.type(await screen.findByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.click(await screen.findByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
  });
});

describe('sign up', () => {
  it('requires matching passwords and the estimates acknowledgement', async () => {
    const { user, service } = renderApp('/signup');
    await user.type(await screen.findByLabelText('What should we call you?'), 'Sam');
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm password'), 'different99');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords don’t match.')).toBeInTheDocument();
    expect(screen.getByText('Please confirm you understand how Lunelle works.')).toBeInTheDocument();
    expect(service.signUp).not.toHaveBeenCalled();
  });

  it('creates the account and asks the user to verify their email', async () => {
    const { user, service, router } = renderApp('/signup');
    await user.type(await screen.findByLabelText('What should we call you?'), '  Sam ');
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm password'), 'longenough1');
    await user.click(screen.getByRole('checkbox', { name: /I understand Lunelle provides estimates/ }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(service.signUp).toHaveBeenCalledWith('sam@example.com', 'longenough1', 'Sam');
    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    // The email is passed in router state, never in the URL.
    expect(router.state.location.pathname).toBe('/verify-email');
    expect(router.state.location.search).toBe('');
  });
});

describe('password reset', () => {
  it('sends a reset link without revealing whether the account exists', async () => {
    const { user, service } = renderApp('/forgot-password');
    await user.type(await screen.findByLabelText('Email'), 'sam@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(service.sendPasswordReset).toHaveBeenCalledWith('sam@example.com');
    expect(await screen.findByText(/If an account exists for that email/)).toBeInTheDocument();
  });

  it('explains an invalid or expired link', async () => {
    renderApp('/reset-password');
    expect(await screen.findByRole('heading', { name: 'Link expired' })).toBeInTheDocument();
  });

  it('lets a user arriving from a recovery link set a new password', async () => {
    const fake = createFakeAuthService();
    const { user, emit, service } = renderApp('/reset-password', fake);
    emit('PASSWORD_RECOVERY', fakeSession());
    await user.type(await screen.findByLabelText('New password'), 'brand-new-pass');
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Update password' }));
    await waitFor(() => expect(service.updatePassword).toHaveBeenCalledWith('brand-new-pass'));
    expect(await screen.findByText('Private dashboard')).toBeInTheDocument();
  });

  it('does not offer the reset form to a normally signed-in session', async () => {
    renderApp('/reset-password', createFakeAuthService(fakeSession()));
    expect(await screen.findByText('Settings area')).toBeInTheDocument();
  });
});
