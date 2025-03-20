import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PropsWithChildren } from "preact/compat";

interface SortableItem {
  id: string;
}

export function SortableItem(props: PropsWithChildren<SortableItem>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 100 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
      <div
        {...attributes}
        {...listeners}
        className="absolute -right-4 bg-background p-2 rounded-full cursor-grab active:cursor-grabbing top-1/3"
        role={undefined}
      >
        <GripVertical size={16} />
      </div>
    </div>
  );
}
