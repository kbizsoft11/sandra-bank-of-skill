import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Marks an <ng-template> as the custom cell renderer for a given column key.
 * The row is exposed both as the implicit context and as `row`.
 *
 * Usage:
 *   <ng-template appTableCol="actions" let-row>
 *     <button (click)="doSomething(row)">...</button>
 *   </ng-template>
 *
 *   <ng-template appTableCol="status" let-row="row">
 *     <span class="badge" [ngClass]="badgeClass(row.status)">{{ row.status }}</span>
 *   </ng-template>
 *
 * Columns without a matching template fall back to plain text interpolation
 * of the column's `key` on the row.
 */
@Directive({
  selector: '[appTableCol]',
  standalone: true
})
export class TableColDirective {
  @Input('appTableCol') columnKey!: string;

  constructor(public readonly template: TemplateRef<any>) {}
}