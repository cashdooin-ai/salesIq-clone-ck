import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials, generateColor } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'busy' | 'offline';
  className?: string;
}

export function Avatar({ src, alt, name = '', size = 'md', status, className }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const statusSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const backgroundColor = generateColor(name);
  const initials = getInitials(name);

  return (
    <div className={cn('relative inline-block', className)}>
      <AvatarPrimitive.Root
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          sizes[size]
        )}
      >
        <AvatarPrimitive.Image
          src={src}
          alt={alt || name}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center font-medium text-white"
          style={{ backgroundColor }}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full border-2 border-white',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
