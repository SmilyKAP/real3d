import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Render3Component } from './render3.component';


const routes: Routes = [
  {
    path: '',
    component: Render3Component
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Render3RoutingModule {}
