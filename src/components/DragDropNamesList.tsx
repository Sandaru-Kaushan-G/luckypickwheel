import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';

interface DraggableNameItemProps {
  id: string;
  name: string;
  index: number;
  onRemove: (index: number) => void;
  isSpinning: boolean;
}

const DraggableNameItem: React.FC<DraggableNameItemProps> = ({ 
  id, 
  name, 
  index, 
  onRemove, 
  isSpinning 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-item flex items-center justify-between p-2 sm:p-3 bg-secondary/50 border border-border/50 rounded-md ${
        isDragging ? 'is-dragging' : ''
      }`}
      {...attributes}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-secondary/70 transition-colors flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-foreground text-sm sm:text-base truncate">{name}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        disabled={isSpinning}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all p-1 sm:p-2 flex-shrink-0"
        aria-label={`Remove ${name}`}
      >
        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
      </Button>
    </div>
  );
};

interface DragDropNamesListProps {
  names: string[];
  onReorder: (names: string[]) => void;
  onRemove: (index: number) => void;
  isSpinning: boolean;
}

export const DragDropNamesList: React.FC<DragDropNamesListProps> = ({
  names,
  onReorder,
  onRemove,
  isSpinning,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = names.findIndex((name, index) => `${index}-${name}` === active.id);
      const newIndex = names.findIndex((name, index) => `${index}-${name}` === over?.id);

      const newNames = arrayMove(names, oldIndex, newIndex);
      onReorder(newNames);
    }
  }

  if (names.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6 sm:py-8">
        <div className="mb-2 text-3xl sm:text-4xl">📝</div>
        <p className="text-sm sm:text-base">No names added yet.</p>
        <p className="text-xs sm:text-sm">Add some names to get started!</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {/* Scrollable container that shows max 3-4 items based on screen size */}
      <div className={`space-y-2 ${names.length > 4 ? 'max-h-60 sm:max-h-72 overflow-y-auto pr-1 sm:pr-2' : ''}`}>
        <SortableContext 
          items={names.map((name, index) => `${index}-${name}`)} 
          strategy={verticalListSortingStrategy}
        >
          {names.map((name, index) => (
            <DraggableNameItem
              key={`${index}-${name}`}
              id={`${index}-${name}`}
              name={name}
              index={index}
              onRemove={onRemove}
              isSpinning={isSpinning}
            />
          ))}
        </SortableContext>
      </div>
      <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2 flex-wrap">
        <div className="flex items-center gap-1 sm:gap-2">
          <GripVertical className="w-3 h-3" />
          <span>Drag to reorder</span>
        </div>
        <span>•</span>
        <span>{names.length} names</span>
        <span>•</span>
        <span className={names.length < 2 ? 'text-orange-500' : 'text-green-500'}>
          {names.length < 2 ? 'Add at least 2 names to spin' : 'Ready to spin!'}
        </span>
        {names.length > 4 && (
          <>
            <span className="hidden sm:inline">•</span>
            <span className="text-xs opacity-70 hidden sm:inline">Scroll to see all names</span>
          </>
        )}
      </div>
    </DndContext>
  );
};

export default DragDropNamesList;
