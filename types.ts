export interface PropertyPackage {
  id: string;
  name: string;
  price: string;
  features: string[];
}

export interface MessageLog {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
