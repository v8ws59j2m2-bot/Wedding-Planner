// ─────────────────────────────────────────────────────────────────────────────
// useStorage — React hook wrapping the data service
//
// This is the only place that bridges React state with dataService.ts.
// Components call setData() to update state; the hook persists via the service.
// When migrating to Supabase, the service layer changes but this hook stays.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import type { AppData } from '../types'
import {
  loadAppData, saveAppData,
  loadWeddingDetails,
  exportAllData,
  parseImport,
} from '../services/dataService'

export function useStorage() {
  const [data, setDataState] = useState<AppData>(() => loadAppData())

  // Persist on every change
  useEffect(() => {
    saveAppData(data)
  }, [data])

  // Wrap setState so callers don't need to know about the service
  const setData = (update: AppData | ((prev: AppData) => AppData)) => {
    setDataState(update)
  }

  const exportData = () => {
    const details = loadWeddingDetails()
    exportAllData(data, details)
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseImport(text, file.name)
      if (!result.success) {
        alert(result.error)
        return
      }
      setDataState(prev => ({
        ...prev,
        ...(result.data.guests    !== undefined && { guests:     result.data.guests }),
        ...(result.data.budget    !== undefined && { budget:     result.data.budget }),
        ...(result.data.checklist !== undefined && { checklist:  result.data.checklist }),
        ...(result.data.vendors   !== undefined && { vendors:    result.data.vendors }),
        ...(result.data.moodImages!== undefined && { moodImages: result.data.moodImages }),
      }))
    }
    reader.readAsText(file)
  }

  return { data, setData, exportData, importData }
}
