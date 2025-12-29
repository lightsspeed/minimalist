import { useCountAnimation } from '@/hooks/useCountAnimation';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  delay = 0,
  suffix = '',
  className = '',
}: AnimatedNumberProps) {
  const displayValue = useCountAnimation(value, { duration, delay });

  return (
    <span className={className}>
      {displayValue}{suffix}
    </span>
  );
}
