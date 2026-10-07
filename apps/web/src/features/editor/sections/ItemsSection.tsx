import { Add01Icon } from "@hugeicons/core-free-icons"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  blankItem,
  calculate,
  canAddItem,
  cloneItem,
  removeItem,
  reorder,
} from "@workspace/shared"
import { useMemo } from "react"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@/components/Icon"
import { ItemCard } from "./ItemCard"
import type { SectionProps } from "./types"

export function ItemsSection({ doc, update, error, disabled }: SectionProps) {
  const calculated = useMemo(() => calculate(doc), [doc])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    update((d) => ({
      ...d,
      items: reorder(
        d.items,
        d.items.findIndex((i) => i.id === active.id),
        d.items.findIndex((i) => i.id === over.id)
      ),
    }))
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={doc.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {doc.items.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              index={index}
              count={doc.items.length}
              currency={doc.currency}
              amount={calculated.items[index]?.amount ?? null}
              childAmounts={(calculated.items[index]?.children ?? []).map(
                (c) => c.amount
              )}
              disabled={disabled}
              error={error}
              onChange={(next) =>
                update((d) => ({
                  ...d,
                  items: d.items.map((i) => (i.id === item.id ? next : i)),
                }))
              }
              onDuplicate={() =>
                update((d) => {
                  const at = d.items.findIndex((i) => i.id === item.id)
                  const items = [...d.items]
                  items.splice(at + 1, 0, cloneItem(item))
                  return { ...d, items }
                })
              }
              onRemove={() =>
                update((d) => ({ ...d, items: removeItem(d.items, item.id) }))
              }
              onMove={(by) =>
                update((d) => ({
                  ...d,
                  items: reorder(d.items, index, index + by),
                }))
              }
            />
          ))}
        </SortableContext>
      </DndContext>
      {error("items") && (
        <p className="text-xs text-destructive">{error("items")}</p>
      )}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          disabled={!canAddItem(doc)}
          onClick={() =>
            update((d) => ({ ...d, items: [...d.items, blankItem()] }))
          }
        >
          <Icon icon={Add01Icon} /> Add item
        </Button>
      )}
    </div>
  )
}
