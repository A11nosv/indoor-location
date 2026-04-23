import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BLEDevice } from '../models/ble-device.model';

@Injectable({
  providedIn: 'root'
})
export class BleDeviceService {
  private devicesSubject = new BehaviorSubject<BLEDevice[]>([]);
  public devices$ = this.devicesSubject.asObservable();

  constructor() {
    // Initial mock data
    this.loadInitialData();
  }

  private loadInitialData() {
    const mockDevices: BLEDevice[] = [
      {
        id: '1',
        name: 'Beacon Entrada',
        macAddress: 'AA:BB:CC:DD:EE:01',
        txPower: -59,
        optimalDistance: 2.5,
        maxDistance: 15,
        status: 'active'
      },
      {
        id: '2',
        name: 'Beacon Sala Reuniones',
        macAddress: 'AA:BB:CC:DD:EE:02',
        txPower: -62,
        optimalDistance: 3.0,
        maxDistance: 12,
        status: 'active'
      }
    ];
    this.devicesSubject.next(mockDevices);
  }

  addDevice(device: BLEDevice) {
    const current = this.devicesSubject.value;
    this.devicesSubject.next([...current, device]);
  }

  updateDevice(id: string, updates: Partial<BLEDevice>) {
    const current = this.devicesSubject.value;
    const updated = current.map(d => d.id === id ? { ...d, ...updates } : d);
    this.devicesSubject.next(updated);
  }

  deleteDevice(id: string) {
    const current = this.devicesSubject.value;
    this.devicesSubject.next(current.filter(d => d.id !== id));
  }
}
