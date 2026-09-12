// Azione rapida da QR/scorciatoia PWA: l'adesivo QR in oratorio (o la
// scorciatoia "Timbra Ingresso/Uscita" del manifest) punta a "/?qa=in" o
// "/?qa=out". Se l'utente non è loggato, l'intento resta in localStorage e
// riemerge come banner di conferma alla prima Home dopo il login.
const KEY = 'job_pending_qa'

export type QaAction = 'in' | 'out'

function isQaAction(v: string | null): v is QaAction {
  return v === 'in' || v === 'out'
}

/** Da chiamare una sola volta all'avvio dell'app, prima del routing. */
export function captureQaFromUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const qa = params.get('qa')
  if (isQaAction(qa)) {
    localStorage.setItem(KEY, qa)
    const url = new URL(window.location.href)
    url.searchParams.delete('qa')
    window.history.replaceState({}, '', url.pathname + url.search)
  }
}

export function consumePendingQa(): QaAction | null {
  const v = localStorage.getItem(KEY)
  if (isQaAction(v)) {
    localStorage.removeItem(KEY)
    return v
  }
  return null
}
