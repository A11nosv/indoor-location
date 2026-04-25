import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'ble-devices',
    loadComponent: () => import('./pages/ble-devices/ble-devices.page').then((m) => m.BleDevicesPage),
  },
  {
    path: 'study',
    loadComponent: () => import('./pages/study/study.page').then((m) => m.StudyPage),
  },
  {
    path: 'installation',
    loadComponent: () => import('./pages/installation/installation.page').then((m) => m.InstallationPage),
  },
  {
    path: 'revision',
    loadComponent: () => import('./pages/revision/revision.page').then((m) => m.RevisionPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
