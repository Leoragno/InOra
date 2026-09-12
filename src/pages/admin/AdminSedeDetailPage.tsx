import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { OratoryDashboardView } from './OratoryDashboardView'
import type { OratoryId } from '../../types'

export function AdminSedeDetailPage() {
  const { oratoryId } = useParams<{ oratoryId: OratoryId }>()
  const navigate = useNavigate()
  if (!oratoryId) return null

  return (
    <div>
      <button onClick={() => navigate('/admin')} className="ml-5 mt-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 lg:ml-8">
        <ChevronLeft size={16} /> Sedi
      </button>
      <OratoryDashboardView oratoryId={oratoryId} />
    </div>
  )
}
