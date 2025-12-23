
import { DeviceType, UsageLog, ActivityCategory } from "../types";

/**
 * NativeBridge: Handles communication with Electron (Desktop) or Capacitor (Mobile)
 * This is the core for "True Software" functionality beyond the browser.
 */
export const NativeBridge = {
  // Check if we are running inside a native shell
  isNative: () => {
    return (window as any).Electron || (window as any).Capacitor;
  },

  // Start automatic recording (Simulated for web, real for native)
  startAutoRecording: async (onUpdate: (log: Partial<UsageLog>) => void) => {
    if ((window as any).Electron) {
      // In Electron, we call a node script to monitor active windows
      (window as any).Electron.ipcRenderer.send('start-monitor');
      (window as any).Electron.ipcRenderer.on('window-changed', (event: any, data: any) => {
        onUpdate({
          appName: data.owner.name,
          activityDescription: data.title,
          deviceType: DeviceType.PC,
          category: ActivityCategory.Work
        });
      });
    } else {
      console.log("Web mode: Auto-recording requires Desktop/Mobile Agent.");
    }
  },

  // Get current platform info
  getPlatformInfo: () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) return DeviceType.Mobile;
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return DeviceType.Mobile;
    return DeviceType.PC;
  }
};
