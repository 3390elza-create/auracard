import type { ElementType, HTMLAttributes } from 'react'

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType
  rounded?: 'lg' | 'xl'
}

export function Panel({
  as: Component = 'div',
  rounded = 'lg',
  className = '',
  children,
  ...rest
}: PanelProps) {
  const radius = rounded === 'xl' ? 'rounded-xl' : 'rounded-lg'
  return (
    <Component
      className={`bg-glass-fill border border-glass-border backdrop-blur-glass ${radius} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}
