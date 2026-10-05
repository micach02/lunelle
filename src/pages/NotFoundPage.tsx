import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<span aria-hidden>🌙</span>}
      title="Page not found"
      description="The page you’re looking for doesn’t exist."
      action={<ButtonLink to="/">Back to home</ButtonLink>}
    />
  );
}
