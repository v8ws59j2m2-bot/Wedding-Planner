import { createContext, useContext } from 'react'
import { useMoodBoard } from '../hooks/useMoodBoard'

type MoodBoardContextValue = ReturnType<typeof useMoodBoard>

const MoodBoardContext = createContext<MoodBoardContextValue | null>(null)

/** Keeps mood board sync alive for the full app session (not just the Planning tab). */
export function MoodBoardProvider({ children }: { children: React.ReactNode }) {
  const value = useMoodBoard()
  return (
    <MoodBoardContext.Provider value={value}>
      {children}
    </MoodBoardContext.Provider>
  )
}

export function useMoodBoardContext(): MoodBoardContextValue {
  const ctx = useContext(MoodBoardContext)
  if (!ctx) throw new Error('useMoodBoardContext must be used within MoodBoardProvider')
  return ctx
}