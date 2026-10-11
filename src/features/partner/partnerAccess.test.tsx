import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { PartnerAccessPage } from '@/pages/auth/PartnerAccessPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/guards';
import { createFakeAuthService, fakeSession } from '@/test/fakeAuthService';
import * as partnerService from './services/partnerService';

vi.mock('./services/partnerService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/partnerService')>();
  return { ...actual, verifySignInLink: vi.fn(), requestSignInLink: vi.fn() };
});

const verifySignInLink = vi.mocked(partnerService.verifySignInLink);
const requestSignInLink = vi.mocked(partnerService.requestSignInLink);

function renderAt(path: string, fake = createFakeAuthService()) {
  const router = createMemoryRouter(
    [
      { path: '/shared-access', element: <PartnerAccessPage /> },
      { path: '/login', element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute> },
      { path: '/partner', element: <ProtectedRoute><h1>Shared view</h1></ProtectedRoute> },
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

beforeEach(() => {
  verifySignInLink.mockReset();
  requestSignInLink.mockReset();
});

describe('password-less partner access', () => {
  it('signs a partner in from the emailed link and opens the shared view', async () => {
    const fake = createFakeAuthService();
    verifySignInLink.mockImplementation(async () => {
      // Like the real network call, resolve asynchronously.
      await new Promise((resolve) => setTimeout(resolve, 0));
      fake.emit('SIGNED_IN', fakeSession('alex@example.com'));
    });
    const { router } = renderAt('/shared-access?token_hash=abc123&type=magiclink', fake);
    expect(await screen.findByText('Shared view')).toBeInTheDocument();
    expect(verifySignInLink).toHaveBeenCalledTimes(1);
    expect(verifySignInLink).toHaveBeenCalledWith('abc123', 'magiclink');
    // The one-time token never lingers in the URL.
    expect(router.state.location.search).toBe('');
  });

  it('offers a new link when the emailed link has expired', async () => {
    verifySignInLink.mockRejectedValueOnce(new Error('expired'));
    renderAt('/shared-access?token_hash=old&type=magiclink');
    expect(await screen.findByText(/expired or was already used/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email me a sign-in link' })).toBeInTheDocument();
  });

  it('ignores links with an unexpected type', async () => {
    renderAt('/shared-access?token_hash=abc&type=recovery');
    expect(await screen.findByRole('button', { name: 'Email me a sign-in link' })).toBeInTheDocument();
    expect(verifySignInLink).not.toHaveBeenCalled();
  });

  it('requests a fresh link with a response that never reveals who has access', async () => {
    requestSignInLink.mockResolvedValueOnce();
    const { user } = renderAt('/shared-access');
    await user.type(await screen.findByLabelText('Your email'), 'Alex@Example.com');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(requestSignInLink).toHaveBeenCalledWith('Alex@Example.com');
    expect(await screen.findByText(/If this email has access to a shared cycle/)).toBeInTheDocument();
  });

  it('sends signed-out visitors of the shared view to the link page, not the password login', async () => {
    renderAt('/partner');
    expect(await screen.findByRole('heading', { name: 'View a shared cycle' })).toBeInTheDocument();
  });

  it('links to partner access from the login page', async () => {
    renderAt('/login');
    expect(await screen.findByRole('link', { name: 'Get a sign-in link' })).toHaveAttribute('href', '/shared-access');
  });

  it('sends an already signed-in partner straight to the shared view', async () => {
    renderAt('/shared-access', createFakeAuthService(fakeSession()));
    expect(await screen.findByText('Shared view')).toBeInTheDocument();
  });

  it('waits for a valid link before showing anything', async () => {
    let finish: () => void = () => {};
    verifySignInLink.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    renderAt('/shared-access?token_hash=abc&type=magiclink');
    expect(await screen.findByRole('status')).toHaveTextContent('Signing you in');
    finish();
    await waitFor(() => expect(verifySignInLink).toHaveBeenCalledTimes(1));
  });
});
