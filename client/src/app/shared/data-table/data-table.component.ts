import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TableColDirective } from './table-col.directive';
import { SortDirection, SortEvent, TableColumn } from './table-column.model';

/**
 * Generic, reusable data table with search, sortable headers, and pagination
 * (first / prev / page numbers / next / last — nav controls are icon-only).
 *
 * Works in two modes:
 *  - Client-side (default): pass the full dataset via [data]; searching,
 *    sorting and pagination all happen inside this component.
 *  - Server-side: set [serverSide]="true", pass only the current page of
 *    rows via [data], and pass [totalItems] for the overall count. Listen to
 *    (searchChange), (sortChange), (pageChange) and (pageSizeChange) to
 *    refetch from your API.
 *
 * Custom cell markup (avatars, badges, action buttons, etc.) is supplied by
 * the consumer via <ng-template appTableCol="columnKey">. See TableColDirective.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TableColDirective],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss']
})
export class DataTableComponent<T = any> implements OnInit, OnChanges, AfterContentInit, OnDestroy {
  // ---- Data & columns ------------------------------------------------------
  @Input() columns: TableColumn[] = [];
  @Input() data: T[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No records found.';
  /** Row key used for trackBy. Supports dot-notation. Falls back to the row reference if missing. */
  @Input() trackByKey = '_id';

  // ---- Server-side mode ------------------------------------------------------
  /** When true, `data` is assumed to already be the filtered/sorted/paginated page from the API. */
  @Input() serverSide = false;
  /** Required when serverSide = true — total record count across all pages. */
  @Input() totalItems = 0;

  // ---- Search ------------------------------------------------------
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Search...';
  /** Keys to search against on the client, dot-notation supported. Defaults to all column keys. */
  @Input() searchKeys: string[] = [];

  // ---- Pagination ------------------------------------------------------
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input() currentPage = 1;

  // ---- Row interaction ------------------------------------------------------
  @Input() rowClickable = false;

  // ---- Outputs ------------------------------------------------------
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() rowClick = new EventEmitter<T>();

  @ContentChildren(TableColDirective) cellTemplates!: QueryList<TableColDirective>;

  searchTerm = '';
  sortKey: string | null = null;
  sortDirection: SortDirection | null = null;

  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private templatesSub?: Subscription;
  private templateMap = new Map<string, TemplateRef<any>>();

  ngOnInit(): void {
    this.searchSub = this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.currentPage = 1;
      this.searchChange.emit(term);
    });
  }

  ngAfterContentInit(): void {
    this.syncTemplateMap();
    this.templatesSub = this.cellTemplates.changes.subscribe(() => this.syncTemplateMap());
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Any externally-driven change to page size should reset back to page 1.
    if (changes['pageSize'] && !changes['pageSize'].firstChange) {
      this.currentPage = 1;
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.templatesSub?.unsubscribe();
    this.searchSubject.complete();
  }

  private syncTemplateMap(): void {
    this.templateMap.clear();
    this.cellTemplates.forEach((t) => this.templateMap.set(t.columnKey, t.template));
  }

  getTemplate(key: string): TemplateRef<any> | null {
    return this.templateMap.get(key) ?? null;
  }

  getValue(row: any, key: string): any {
    return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), row);
  }

  trackByFn = (_index: number, row: any): any => this.getValue(row, this.trackByKey) ?? row;

  // ---- Search ------------------------------------------------------
  onSearchInput(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  // ---- Sorting ------------------------------------------------------
  onSort(column: TableColumn): void {
    if (!column.sortable) {
      return;
    }
    if (this.sortKey !== column.key) {
      this.sortKey = column.key;
      this.sortDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else {
      this.sortKey = null;
      this.sortDirection = null;
    }
    this.currentPage = 1;
    this.sortChange.emit({ key: column.key, direction: this.sortDirection });
  }

  sortIconClass(column: TableColumn): string {
    if (!column.sortable) {
      return '';
    }
    if (this.sortKey !== column.key || !this.sortDirection) {
      return 'bi-arrow-down-up text-muted';
    }
    return this.sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // ---- Derived data (client-side mode only) ------------------------------------------------------
  get filteredData(): T[] {
    if (this.serverSide || !this.searchTerm.trim()) {
      return this.data;
    }
    const term = this.searchTerm.trim().toLowerCase();
    const keys = this.searchKeys.length ? this.searchKeys : this.columns.map((c) => c.key);
    return this.data.filter((row) =>
      keys.some((key) => String(this.getValue(row, key) ?? '').toLowerCase().includes(term))
    );
  }

  get sortedData(): T[] {
    if (this.serverSide || !this.sortKey || !this.sortDirection) {
      return this.filteredData;
    }
    const key = this.sortKey;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.filteredData].sort((a, b) => {
      const va = this.getValue(a, key);
      const vb = this.getValue(b, key);
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }

  get totalRecords(): number {
    return this.serverSide ? this.totalItems : this.sortedData.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get pagedData(): T[] {
    if (this.serverSide) {
      return this.data;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedData.slice(start, start + this.pageSize);
  }

  get rangeStart(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  /** Compact page-number strip with ellipses, e.g. 1 … 4 5 6 … 12 */
  get pageNumbers(): (number | 'ellipsis')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;

    pages.push(1);
    if (current - delta > 2) {
      pages.push('ellipsis');
    }
    for (let p = Math.max(2, current - delta); p <= Math.min(total - 1, current + delta); p++) {
      pages.push(p);
    }
    if (current + delta < total - 1) {
      pages.push('ellipsis');
    }
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  // ---- Pagination actions ------------------------------------------------------
  goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages);
    if (clamped === this.currentPage) {
      return;
    }
    this.currentPage = clamped;
    this.pageChange.emit(clamped);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size);
    this.currentPage = 1;
    this.pageSizeChange.emit(this.pageSize);
  }

  onRowClick(row: T): void {
    if (this.rowClickable) {
      this.rowClick.emit(row);
    }
  }
}