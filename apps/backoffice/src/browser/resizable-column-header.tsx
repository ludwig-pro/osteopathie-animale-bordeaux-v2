import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';
import { useRef } from 'react';
import {
  clampColumnWidth,
  maximumColumnWidth,
  type ContactColumn,
} from './contact-column-widths';
import { TableHeader } from './ui/table';

export function ResizableColumnHeader({
  column,
  width,
  onResize,
  onCommit,
  onSort,
  sortDirection,
}: {
  onSort: () => void;
  sortDirection?: 'asc' | 'desc';
  column: ContactColumn;
  width: number;
  onResize: (column: ContactColumn, width: number) => void;
  onCommit: () => void;
}) {
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  return (
    <TableHeader
      className="relative select-none pr-5"
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : 'none'
      }
    >
      <button
        type="button"
        onClick={onSort}
        className="flex w-full items-center gap-1.5 text-left hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-green-700"
      >
        <span className="truncate">{column.label}</span>
        {sortDirection &&
          (sortDirection === 'asc' ? (
            <ArrowUpIcon className="size-3.5 shrink-0" />
          ) : (
            <ArrowDownIcon className="size-3.5 shrink-0" />
          ))}
      </button>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Largeur de la colonne ${column.label}`}
        aria-valuemin={column.min}
        aria-valuemax={maximumColumnWidth}
        aria-valuenow={width}
        aria-valuetext={`${width} pixels`}
        title="Glisser pour ajuster · Double-clic pour réinitialiser"
        className="absolute inset-y-0 right-0 z-10 flex w-4 touch-none cursor-col-resize items-center justify-center outline-none after:h-4 after:w-px after:rounded-full after:bg-zinc-200 after:transition-colors hover:after:bg-zinc-500 focus-visible:after:w-0.5 focus-visible:after:bg-green-700 active:after:bg-green-700"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: width,
          };
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (!active || active.pointerId !== event.pointerId) return;
          onResize(
            column,
            clampColumnWidth(
              column,
              active.startWidth + event.clientX - active.startX
            )
          );
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
          onCommit();
        }}
        onLostPointerCapture={() => {
          if (!drag.current) return;
          drag.current = null;
          onCommit();
        }}
        onDoubleClick={() => {
          onResize(column, column.width);
          onCommit();
        }}
        onKeyDown={(event) => {
          let next;
          if (event.key === 'ArrowLeft')
            next = width - (event.shiftKey ? 50 : 10);
          else if (event.key === 'ArrowRight')
            next = width + (event.shiftKey ? 50 : 10);
          else if (event.key === 'Home') next = column.width;
          else return;
          event.preventDefault();
          onResize(column, clampColumnWidth(column, next));
          onCommit();
        }}
      />
    </TableHeader>
  );
}
