import * as React from 'react'
import { Flag, Loader2 } from 'lucide-react'
import type { Patient } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { enqueueReviewTask } from '@/lib/reviewQueue'

const PRIORITIES = [
  { value: 'routine', label: 'Плановый — при следующем обходе' },
  { value: 'urgent', label: 'Срочный — в течение часа' },
  { value: 'immediate', label: 'Немедленный — лечащий врач сейчас' },
]

export function FlagForReview({ patient }: { patient: Patient }) {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [priority, setPriority] = React.useState('urgent')
  const [note, setNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      const task = await enqueueReviewTask({
        patientId: patient.id,
        priority,
        note,
        riskScore: patient.riskScore,
      })
      toast({
        title: 'Отправлено на врачебную проверку',
        description: `${patient.id} добавлен в очередь проверки (№${task.ticketId}, ${PRIORITIES.find((p) => p.value === priority)?.label ?? priority}).`,
        variant: 'success',
      })
      setOpen(false)
      setNote('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Flag className="h-4 w-4" />
          На проверку
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Отправить пациента {patient.name} на проверку
          </DialogTitle>
          <DialogDescription>
            Задача будет добавлена в очередь врачебной проверки. Это не заменяет
            немедленный вызов врача в экстренной ситуации.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="priority">Приоритет</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Клиническая заметка (необязательно)</Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Например: рост FiO₂ и повторные апноэ за последние 6 ч."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button onClick={submit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Добавить в очередь
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
