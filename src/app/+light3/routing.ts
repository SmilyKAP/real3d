import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Component } from './component';


const routes: Routes = [
  {
    path: '',
    component: Component
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Routing {}
