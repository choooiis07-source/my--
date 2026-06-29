import { type ReactNode } from 'react'
import { useInView } from '../hooks/useScroll'

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur'

const base = 'transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform'

const hiddenMap: Record<Direction, string> = {
  up: 'opacity-0 translate-y-16',
  down: 'opacity-0 -translate-y-16',
  left: 'opacity-0 translate-x-16',
  right: 'opacity-0 -translate-x-16',
  scale: 'opacity-0 scale-90',
  blur: 'opacity-0 blur-xl scale-105',
}

const visibleMap: Record<Direction, string> = {
  up: 'opacity-100 translate-y-0',
  down: 'opacity-100 translate-y-0',
  left: 'opacity-100 translate-x-0',
  right: 'opacity-100 translate-x-0',
  scale: 'opacity-100 scale-100',
  blur: 'opacity-100 blur-0 scale-100',
}

interface RevealProps {
  children: ReactNode
  direction?: Direction
  delay?: number
  className?: string
  threshold?: number
  as?: 'div' | 'section' | 'span' | 'p' | 'h1' | 'h2' | 'h3'
  once?: boolean
}

export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  threshold = 0.2,
  as = 'div',
  once = false,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold, once })
  const Tag = as as any

  return (
    <Tag
      ref={ref as any}
      className={`${base} ${inView ? visibleMap[direction] : hiddenMap[direction]} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}