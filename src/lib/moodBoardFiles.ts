export type MoodBoardFileKind = 'image' | 'pdf' | 'external'

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'svg', 'bmp',
])

const PDF_EXTENSIONS = new Set(['pdf'])

function extensionFromSrc(src: string): string {
  const withoutQuery = src.split('?')[0].split('#')[0]
  const match = withoutQuery.match(/\.([a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : ''
}

/** Detect how a mood board item should open, based on URL / data URI. */
export function getMoodBoardFileKind(src: string): MoodBoardFileKind {
  if (!src) return 'external'
  if (src.startsWith('data:image/')) return 'image'
  if (src.startsWith('data:application/pdf')) return 'pdf'

  const ext = extensionFromSrc(src)
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (PDF_EXTENSIONS.has(ext)) return 'pdf'

  // Supabase moodboard uploads are images even if the path is unusual
  if (!ext && /\/storage\/v1\/object\/public\/moodboard\//i.test(src)) return 'image'

  return 'external'
}

export type OpenMoodBoardFileOptions = {
  onImagePreview: () => void
}

/** Open a mood board file using the appropriate viewer. */
export function openMoodBoardFile(src: string, options: OpenMoodBoardFileOptions): void {
  const kind = getMoodBoardFileKind(src)

  switch (kind) {
    case 'image':
      options.onImagePreview()
      break
    case 'pdf':
      window.open(src, '_blank', 'noopener,noreferrer')
      break
    case 'external':
    default:
      window.open(src, '_blank', 'noopener,noreferrer')
      break
  }
}