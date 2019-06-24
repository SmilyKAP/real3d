import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Render2Component } from './render2.component';


const routes: Routes = [
  {
    path: '',
    component: Render2Component
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Render2RoutingModule {}
