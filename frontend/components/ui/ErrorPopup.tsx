'use client';

import Alert from '@/components/ui/Alert';

interface ErrorPopupProps {
  title?: string;
  message: string | null;
  onClose: () => void;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function ErrorPopup({
  title = 'Notice',
  message,
  onClose,
  actionText,
  actionHref,
  onAction,
}: ErrorPopupProps) {
  if (!message) return null;

  return (
    <Alert
      type="error"
      title={title}
      popup
      onClose={onClose}
      action={
        actionText
          ? {
              label: actionText,
              href: actionHref,
              onClick: onAction,
            }
          : undefined
      }
    >
      {message}
    </Alert>
  );
}
