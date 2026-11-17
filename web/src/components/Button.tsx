import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  const classes = [
    styles.button,
    variant === 'primary' ? styles.primary : variant === 'ghost' ? styles.ghost : '',
    size === 'lg' ? styles.large : '',
    className ?? '',
  ].join(' ');
  return <button type={type} className={classes} {...rest} />;
}
