import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

interface Props {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

/** Lightweight, accessible tooltip matching the app's romantic minimalist style. */
export function Tip({ content, children, side = 'top', delay = 400 }: Props) {
  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {/* asChild passes tooltip trigger props to the child without a wrapper div */}
          <span style={{ display: 'contents' }}>{children}</span>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            style={{
              background: '#3B2A22',
              color: '#FFF8EE',
              fontSize: 12,
              lineHeight: 1.5,
              padding: '7px 12px',
              borderRadius: 8,
              maxWidth: 240,
              boxShadow: '0 4px 16px rgba(42,30,20,0.25)',
              fontFamily: 'Inter, sans-serif',
              zIndex: 9999,
              // Subtle entrance animation
              animation: 'tooltipIn 0.12s ease-out',
            }}>
            {content}
            <RadixTooltip.Arrow
              style={{ fill: '#3B2A22' }}
              width={10}
              height={5}
            />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
