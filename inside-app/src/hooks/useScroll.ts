import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * 스크롤 진행도(0~1)와 현재 활성 섹션 인덱스를 반환
 */
export function useScrollProgress(containerRef?: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const el = containerRef?.current ?? document.documentElement
    const onScroll = () => {
      const scrollTop = el === document.documentElement ? window.scrollY : el.scrollTop
      const height =
        el === document.documentElement
          ? document.documentElement.scrollHeight - window.innerHeight
          : el.scrollHeight - el.clientHeight
      setProgress(height > 0 ? Math.min(scrollTop / height, 1) : 0)
    }
    onScroll()
    const target = el === document.documentElement ? window : el
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [containerRef])

  return { progress, activeIndex, setActiveIndex }
}

/**
 * 요소가 뷰포트에 진입했는지 감지. threshold 진입 시 inView=true.
 */
export function useInView<T extends HTMLElement>(options?: {
  threshold?: number
  rootMargin?: string
  once?: boolean
}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  const once = options?.once ?? false

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: options?.threshold ?? 0.2, rootMargin: options?.rootMargin ?? '0px 0px -10% 0px' }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [options?.threshold, options?.rootMargin, once])

  return { ref, inView }
}

/**
 * 전체 페이지 스크롤 위치를 0~1 비율로 추적
 */
export function useScrollRatio() {
  const [ratio, setRatio] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setRatio(h > 0 ? Math.min(window.scrollY / h, 1) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return ratio
}