import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { 
  IonApp, 
  IonRouterOutlet, 
  IonMenu, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonMenuToggle, 
  IonItem, 
  IonIcon, 
  IonLabel 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, bluetoothOutline, analyticsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    RouterLink,
    IonApp, 
    IonRouterOutlet, 
    IonMenu, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonMenuToggle, 
    IonItem, 
    IonIcon, 
    IonLabel
  ],
})
export class AppComponent {
  constructor() {
    addIcons({ mapOutline, bluetoothOutline, analyticsOutline });
  }
}
