
'use client'

import * as React from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SessionProvider>
      {mounted ? (
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      ) : (
        <div suppressHydrationWarning>{children}</div>
      )}
    </SessionProvider>
  )
}
