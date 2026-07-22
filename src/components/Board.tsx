import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useAppStore } from '../store/useAppStore'
import type { Application, OutcomeTag } from '../types'
import Lane from './Lane'
import ApplicationCard from './ApplicationCard'
import OutcomePicker from './OutcomePicker'

interface Props {
  onEdit: (app: Application) => void
}

interface PendingMove {
  applicationId: string
  toLaneId: string
}

export default function Board({ onEdit }: Props) {
  const lanes = useAppStore((s) => s.lanes)
  const applications = useAppStore((s) => s.applications)
  const moveApplication = useAppStore((s) => s.moveApplication)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)

  const sensors = useSensors(
    // Small activation distance so clicks (to edit) aren't hijacked as drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  // Applications grouped by lane, sorted most-recently-updated first.
  const byLane = useMemo(() => {
    const map = new Map<string, Application[]>()
    for (const lane of lanes) map.set(lane.id, [])
    for (const app of applications) {
      const bucket = map.get(app.laneId)
      if (bucket) bucket.push(app)
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    return map
  }, [lanes, applications])

  const activeApp = activeId
    ? applications.find((a) => a.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const applicationId = String(active.id)
    const toLaneId = String(over.id)
    const app = applications.find((a) => a.id === applicationId)
    if (!app || app.laneId === toLaneId) return

    const targetLane = lanes.find((l) => l.id === toLaneId)
    if (targetLane?.isTerminal) {
      // Defer the move until the user picks an outcome; cancelling reverts it.
      setPendingMove({ applicationId, toLaneId })
      return
    }
    void moveApplication(applicationId, toLaneId)
  }

  function confirmOutcome(outcome: OutcomeTag) {
    if (!pendingMove) return
    void moveApplication(pendingMove.applicationId, pendingMove.toLaneId, outcome)
    setPendingMove(null)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex h-full gap-4 overflow-x-auto px-4 pb-4">
          {lanes.map((lane) => (
            <Lane
              key={lane.id}
              lane={lane}
              applications={byLane.get(lane.id) ?? []}
              onEdit={onEdit}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApp ? (
            <div className="w-72">
              <ApplicationCard application={activeApp} onEdit={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <OutcomePicker
          onSelect={confirmOutcome}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </>
  )
}
