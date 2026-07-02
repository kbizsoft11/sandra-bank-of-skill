import {
  Component,
  input,
  output
} from '@angular/core';

@Component({
  selector: 'app-table-actions',
  imports: [],
  templateUrl: './table-actions.html'
})
export class TableActions {

  actions = input<string[]>([]);

  view = output<void>();

  edit = output<void>();

  delete = output<void>();

}