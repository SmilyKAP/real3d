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
    path: 'render8',
    loadChildren: './+render8/module#Module'
  },
  {
    path: 'light1',
    loadChildren: './+light1/module#Module'
  },
  {
    path: 'light2',
    loadChildren: './+light2/module#Module'
  },
  {
    path: 'light3',
    loadChildren: './+light3/module#Module'
  },
  {
    path: 'light4',
    loadChildren: './+light4/module#Module'
  },
  {
    path: 'light5',
    loadChildren: './+light5/module#Module'
  },
  {
    path: 'light6',
    loadChildren: './+light6/module#Module'
  },
  {
    path: 'light7',
    loadChildren: './+light7/module#Module'
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