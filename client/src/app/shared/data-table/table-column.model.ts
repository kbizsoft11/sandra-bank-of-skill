export type ColumnAlign = 'start' | 'center' | 'end';
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface TableColumn {
  /** Property key on the row object. Supports dot-notation for nested values, e.g. 'company.name'. */
  key: string;
  /** Column header label. */
  header: string;
  /** Enables sorting on this column (client-side sort, or emits sortChange for the parent to handle server-side). */
  sortable?: boolean;
  /** Text alignment for header + cells. Defaults to 'start'. */
  align?: ColumnAlign;
  /** Optional fixed width, e.g. '160px' or '20%'. */
  width?: string;
  /** Hide this column below a breakpoint, e.g. 'md' hides it on anything smaller than md. */
  hideBelow?: Breakpoint;
}

export type SortDirection = 'asc' | 'desc';

export interface SortEvent {
  key: string;
  direction: SortDirection | null;
}