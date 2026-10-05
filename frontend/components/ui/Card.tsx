import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export default function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-surface border border-border-base rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden',
        className
      )}
    >
      {children}
    </Tag>
  );
}
