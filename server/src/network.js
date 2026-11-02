import os from 'os';

export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address
        });
      }
    }
  }

  // Prioritize Wi-Fi or Ethernet
  const primary = addresses.find(a => 
    a.interface.toLowerCase().includes('wi-fi') || 
    a.interface.toLowerCase().includes('wireless') || 
    a.interface.toLowerCase().includes('ethernet') ||
    a.interface.toLowerCase().includes('eth')
  ) || addresses[0];

  return primary ? primary.address : 'localhost';
}
