import { useCallback, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { cn } from "../lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
  isDark: boolean
  onToggle: () => void
}

export const AnimatedThemeToggler = ({
  className,
  duration = 500,
  isDark,
  onToggle,
  children,
  ...props
}: AnimatedThemeTogglerProps & { children?: React.ReactNode }) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const { top, left, width, height } = button.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    )

    // @ts-ignore - View Transition API is not yet in TypeScript types
    if (typeof document.startViewTransition !== "function") {
      onToggle()
      return
    }

    // @ts-ignore - View Transition API is not yet in TypeScript types
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        onToggle()
      })
    })

    const ready = transition?.ready
    if (ready && typeof ready.then === "function") {
      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      })
    }
  }, [onToggle, duration])

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        className
      )}
      {...props}
    >
      <div className="relative h-full w-full flex items-center justify-center gap-2">
        <div className="h-full items-center justify-center flex">
           {isDark ? (
              <Sun className="h-5 w-5 shrink-0" />
           ) : (
              <Moon className="h-5 w-5 shrink-0" />
           )}
        </div>
        {children}
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
