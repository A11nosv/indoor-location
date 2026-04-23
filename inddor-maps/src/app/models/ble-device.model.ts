export interface BLEDevice {
  id: string;
  name: string;
  macAddress: string;
  uuid?: string;
  major?: number;
  minor?: number;
  txPower: number; // Power at 1 meter (dBm)
  optimalDistance: number; // Recommended distance for accuracy (meters)
  maxDistance: number; // Signal drop-off limit (meters)
  manufacturer?: string;
  status: 'active' | 'inactive' | 'low-battery';
  lastSeen?: number;
  metadata?: Record<string, any>;
}
