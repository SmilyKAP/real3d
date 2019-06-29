import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';

const appRoutes: Routes = [
  {
    path: 'home',
    loadChildren: './+home/home.module#HomeModule'
  },
  {
    path: 'render1',
    loadChildren: './+render1/render1.module#Render1Module'
  },
  {
    path: 'render2',
    loadChildren: './+render2/render2.module#Render2Module'
  },
  {
    path: 'render3',
    loadChildren: './+render3/module#Module'
  },
  {
    path: 'render4',
    loadChildren: './+render4/module#Module'
  },
  {
    path: 'render5',
    loadChildren: './+render5/module#Module'
  },
  {
    path: 'render6',
    loadChildren: './+render6/module#Module'
  },
  {
    path: 'render7',
    loadChildren: './+render7/module#Module'
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
