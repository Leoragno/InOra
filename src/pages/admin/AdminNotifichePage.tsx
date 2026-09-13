import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import * as pushService from '../../services/pushService'
import { scopedOratories } from '../../utils/authz'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Field, SelectInput, TextInput } from '../../components/Field'
import type { OratoryId } from '../../types'

const ORATORY_LABEL: Record<OratoryId, string> = { jerago: 'Jerago', besnate: 'Besnate' }

type TargetChoice = 'all' | OratoryId

export function AdminNotifichePage() {
  const { user } = useAuth()
  const toast = useToast()
  const allowed = useMemo(() => (user ? scopedOratories(user) : []), [user])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<TargetChoice>('all')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  if (!user) return null

  async function send() {
    if (!title.trim() || !body.trim()) return toast.error('Titolo e messaggio sono obbligatori')
    setSending(true)
    setLastResult(null)
    try {
      const result = await pushService.sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        target: target === 'all' ? { type: 'all' } : { type: 'oratory', oratoryId: target },
      })
      if (result.sent === 0 && result.reason) {
        toast.info(result.reason)
        setLastResult(result.reason)
      } else {
        toast.success(`Inviata a ${result.sent} dispositiv${result.sent === 1 ? 'o' : 'i'}`)
        setLastResult(`✅ ${result.sent} inviate${result.failed ? ` · ${result.failed} fallite` : ''}`)
        setTitle('')
        setBody('')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invio fallito')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 py-5 lg:px-8 lg:py-7">
      <div className="text-[20px] font-extrabold text-ink-950">Notifiche push</div>

      <Card className="flex flex-col gap-3.5">
        <Field label="Destinatari">
          <SelectInput value={target} onChange={(e) => setTarget(e.target.value as TargetChoice)}>
            <option value="all">Tutti gli animatori</option>
            {allowed.map((o) => <option key={o} value={o}>Solo {ORATORY_LABEL[o]}</option>)}
          </SelectInput>
        </Field>
        <Field label="Titolo">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="📍 Ritrovo" maxLength={60} />
        </Field>
        <Field label="Messaggio">
          <TextInput value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ci vediamo alle 15 in cortile" maxLength={180} />
        </Field>
        <Button onClick={send} loading={sending} fullWidth>Invia notifica</Button>
        {lastResult && <div className="text-center text-[12.5px] font-semibold text-slate-500">{lastResult}</div>}
      </Card>

      <div className="text-[12px] leading-relaxed text-slate-400">
        Arriva solo a chi ha attivato le notifiche dal proprio profilo. Se qualcuno non la riceve, probabilmente non le ha ancora attivate.
      </div>
    </div>
  )
}
