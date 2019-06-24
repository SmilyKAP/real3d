import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Render1Component } from './render1.component';


const routes: Routes = [
  {
    path: '',
    component: Render1Component
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Render1RoutingModule {}
