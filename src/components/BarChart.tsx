import { useState } from 'react'

export interface BarPoint {
  label: string
  value: number
}

/**
 * Grafico a barre leggero, senza dipendenze esterne (porting del vecchio
 * grafico Chart.js dell'app precedente, ma come componente React nativo:
 * niente canvas nascosti da distruggere/ricreare tra i tab).
 */
export function BarChart({ data, color, height = 140, formatValue }: { data: BarPoint[]; color: string; height?: number; formatValue?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const fmt = formatValue ?? ((v: number) => String(v))

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-[12.5px] font-medium text-slate-400" style={{ height }}>
        Nessun dato nel periodo selezionato
      </div>
    )
  }

  const allZero = data.every((d) => d.value === 0)
  const max = Math.max(...data.map((d) => d.value), allZero ? 5 : 1)
  const labelStride = Math.max(1, Math.ceil(data.length / 12))

  return (
    <div className="relative">
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
        >
          {data[hover].label} · {fmt(data[hover].value)}
        </div>
      )}
      <div className="flex items-end gap-[3px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={i}
            className="flex h-full flex-1 flex-col items-center justify-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className="w-full rounded-t-[3px] transition-[height,background-color] duration-200"
              style={{
                height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1)}%`,
                backgroundColor: hover === i ? color : `${color}80`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[9.5px] font-semibold text-slate-400">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center">{i % labelStride === 0 ? d.label : ''}</div>
        ))}
      </div>
    </div>
  )
}
