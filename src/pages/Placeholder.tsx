import { Construction } from 'lucide-react'

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center p-8">
      <Construction size={40} style={{ color: '#E8D5A3', marginBottom: 16 }} strokeWidth={1} />
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: '#3B2A22', marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ color: '#7A6657', fontSize: 14 }}>Coming soon — tell Jamie what to build first!</p>
    </div>
  )
}
