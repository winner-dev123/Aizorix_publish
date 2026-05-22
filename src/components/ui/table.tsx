import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight styled wrappers around <table>, <thead>, <tbody>, <tr>,
 * <th>, <td>. They give every list view in the app a consistent look:
 * soft border, sticky header optional, hover row highlight, dense or
 * comfortable density.
 *
 * Usage:
 *   <Table>
 *     <TableHeader>
 *       <TableRow>
 *         <TableHead>Nombre</TableHead>
 *         …
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       {rows.map(r => (
 *         <TableRow key={r.id}>
 *           <TableCell>{r.name}</TableCell>
 *           …
 *         </TableRow>
 *       ))}
 *     </TableBody>
 *   </Table>
 */

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white shadow-[var(--shadow-sm)]">
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full caption-bottom text-sm text-[color:var(--color-ink-700)]",
            className,
          )}
          {...props}
        />
      </div>
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-gradient-to-br from-[color:var(--color-surface-1)] to-[color:var(--color-surface-2)] text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        "divide-y divide-[color:var(--color-ink-100)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "border-t border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-[color:var(--color-brand-50)]/40 data-[state=selected]:bg-[color:var(--color-brand-50)]/60",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left align-middle font-bold first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-sm text-[color:var(--color-ink-800)] first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn(
        "mt-4 text-xs text-[color:var(--color-ink-500)]",
        className,
      )}
      {...props}
    />
  );
}
