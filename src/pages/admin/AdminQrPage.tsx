// Porting del tab "QR Code" della vecchia app (admin-parrocchia.html): genera
// i due QR fisici da affiggere in oratorio (Ingresso/Uscita), che puntano
// alla stessa scorciatoia "?qa=in"/"?qa=out" già gestita da pendingQa.ts.
// A differenza della vecchia app — multi-tenant con parrocchia nell'URL —
// qui un solo QR per azione vale per entrambi gli oratori: l'oratorio di
// destinazione si ricava dal profilo dell'animatore che scansiona, non
// dall'URL.
import { useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer } from 'lucide-react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, TextInput } from '../../components/Field'

interface QrEntry {
  label: string
  tipo: 'in' | 'out'
  color: string
  url: string
  dataUrl: string
}

function buildPrintHtml(entry: QrEntry): string {
  const title = entry.tipo === 'in' ? '⬆ INGRESSO' : '⬇ USCITA'
  const sublabel = entry.tipo === 'in' ? 'Scansiona per timbrare entrata' : 'Scansiona per timbrare uscita'
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR ${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, sans-serif; background:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20mm; }
  .card { text-align:center; border:4px solid ${entry.color}; border-radius:24px; padding:40px; }
  .title { font-size:44px; font-weight:800; color:${entry.color}; margin-bottom:8px; }
  .sub { font-size:16px; color:#555; margin-bottom:32px; }
  .qr { width:360px; height:360px; margin:0 auto 24px; }
  .url { font-size:11px; color:#999; word-break:break-all; margin-bottom:20px; font-family:monospace; }
  .hint { font-size:14px; color:#555; border-top:2px solid #eee; padding-top:16px; }
  @media print { body { padding:15mm; } * { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
  <div class="card">
    <div class="title">${title}</div>
    <div class="sub">${sublabel}</div>
    <img class="qr" src="${entry.dataUrl}" />
    <div class="url">${entry.url}</div>
    <div class="hint">📱 Scansiona con la fotocamera del telefono</div>
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`
}

export function AdminQrPage() {
  const [baseUrl, setBaseUrl] = useState(() => window.location.origin)
  const [entries, setEntries] = useState<QrEntry[] | null>(null)
  const [generating, setGenerating] = useState(false)

  async function generate() {
    const base = baseUrl.trim().replace(/\/$/, '')
    if (!base) return
    setGenerating(true)
    try {
      const specs: { label: string; tipo: 'in' | 'out'; color: string }[] = [
        { label: 'Ingresso', tipo: 'in', color: '#10b981' },
        { label: 'Uscita', tipo: 'out', color: '#ef4444' },
      ]
      const rows = await Promise.all(specs.map(async (s) => {
        const url = `${base}/?qa=${s.tipo}`
        const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        return { ...s, url, dataUrl }
      }))
      setEntries(rows)
    } finally {
      setGenerating(false)
    }
  }

  function download(entry: QrEntry) {
    const a = document.createElement('a')
    a.href = entry.dataUrl
    a.download = `qr-${entry.tipo === 'in' ? 'ingresso' : 'uscita'}.png`
    a.click()
  }

  function print(entry: QrEntry) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(buildPrintHtml(entry))
    win.document.close()
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="text-[20px] font-extrabold text-ink-950">QR Code</div>

      <Card className="flex flex-col gap-3.5">
        <Field label="URL dell'app" hint="Il QR punta a questo indirizzo con ?qa=in / ?qa=out">
          <TextInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Button onClick={generate} loading={generating}>Genera QR Code</Button>
      </Card>

      {entries && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.tipo} className="animate-up flex flex-col items-center gap-3 text-center">
              <div className="text-sm font-extrabold" style={{ color: entry.color }}>{entry.label}</div>
              <img src={entry.dataUrl} alt={`QR ${entry.label}`} className="h-44 w-44 rounded-xl border border-slate-100" />
              <div className="break-all text-[10.5px] font-medium text-slate-400">{entry.url}</div>
              <div className="flex w-full gap-2">
                <Button variant="secondary" className="!flex-1 !py-2.5 !text-[13px]" icon={<Download size={14} />} onClick={() => download(entry)}>PNG</Button>
                <Button variant="secondary" className="!flex-1 !py-2.5 !text-[13px]" icon={<Printer size={14} />} onClick={() => print(entry)}>Stampa</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
