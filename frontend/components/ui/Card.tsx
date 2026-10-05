import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li';
  hover?: boolean;
}

export default function Card({
  children,
  className,
  as: Tag = 'div',
  hover = false,
}: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-surface rounded-lg overflow-hidden',
        hover &&
          'transition-transform duration-[var(--dur-base)] hover:-translate-y-0.5 hover:shadow-sm',
        className
      )}
    >
      {children}
    </Tag>
  );
}
