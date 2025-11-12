
import { useState, useCallback, useRef } from 'react';

// NOTE TO USER:
// The original C++ code uses Bluetooth Classic (BluetoothSerial).
// Web Bluetooth API in browsers ONLY works with Bluetooth Low Energy (BLE).
// To make this web app work, you must update your ESP32 code to use a BLE library
// and expose a BLE UART service. A popular choice is the Nordic UART Service (NUS).
//
// Assumed BLE Service and Characteristic UUIDs (Nordic UART Service):
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // App -> Device
const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Device -> App

export const useBluetoothDice = (onDataReceived: (data: string) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FIX: Use `any` for Bluetooth types to prevent compilation errors.
  // In a real project, this would be solved by installing @types/web-bluetooth
  // or by configuring the `lib` option in tsconfig.json.
  const deviceRef = useRef<any | null>(null);
  const rxCharacteristicRef = useRef<any | null>(null);
  const textDecoder = new TextDecoder('utf-8');
  const textEncoder = new TextEncoder();

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    deviceRef.current = null;
    rxCharacteristicRef.current = null;
    console.log('Device disconnected.');
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      // FIX: Cast navigator to `any` to access the Web Bluetooth API.
      if (!(navigator as any).bluetooth) {
        throw new Error('Web Bluetooth API is not available on this browser.');
      }

      console.log('Requesting Bluetooth device...');
      // FIX: Cast navigator to `any` to access the Web Bluetooth API.
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ name: 'ESP32_Dice' }],
        optionalServices: [UART_SERVICE_UUID],
      });

      if (!device) {
        throw new Error('No device selected.');
      }

      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', handleDisconnected);

      console.log('Connecting to GATT server...');
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Could not connect to GATT server.');
      }

      console.log('Getting UART service...');
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      
      console.log('Getting TX characteristic...');
      const txCharacteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
      await txCharacteristic.startNotifications();
      // FIX: Use `any` for the event to avoid type errors related to Web Bluetooth.
      txCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        if (value) {
          const receivedText = textDecoder.decode(value);
          // The ESP32 might send multiple messages in one chunk, separated by newlines
          receivedText.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              onDataReceived(trimmedLine);
            }
          });
        }
      });
      
      console.log('Getting RX characteristic...');
      rxCharacteristicRef.current = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
      
      setIsConnected(true);
      console.log('Device connected successfully!');
    } catch (err: any) {
      setError(err.message);
      console.error('Connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [onDataReceived, handleDisconnected, textDecoder]);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
  }, []);

  const sendCommand = useCallback(async (command: string) => {
    if (!isConnected || !rxCharacteristicRef.current) {
      console.warn('Cannot send command: not connected.');
      return;
    }
    try {
      // The command must end with a newline, as expected by `readStringUntil('\n')`
      const commandWithNewline = command + '\n';
      await rxCharacteristicRef.current.writeValueWithoutResponse(textEncoder.encode(commandWithNewline));
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to send command:', err);
    }
  }, [isConnected, textEncoder]);

  return { connect, disconnect, sendCommand, isConnected, isConnecting, error };
};
