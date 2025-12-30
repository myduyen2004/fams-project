import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapService, type ProvinceOnlineData } from '../../../services/api/mapService';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../../hooks/useWebSocket';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const VietnamMap: React.FC = () => {
  const [onlineData, setOnlineData] = useState<ProvinceOnlineData[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch online users data
  const fetchOnlineUsers = async () => {
    try {
      const data = await mapService.getOnlineUsers();
      setOnlineData(data.provinces);
      setTotalOnline(data.totalOnline);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch online users:', error);
      toast.error('Không thể tải dữ liệu bản đồ');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineUsers();
  }, []);

  // Real-time updates via WebSockets
  const handleMapUpdate = useCallback((data: any) => {
    console.log('WS: Received map update', data);
    if (data.provinces) setOnlineData(data.provinces);
    if (data.totalOnline !== undefined) setTotalOnline(data.totalOnline);
  }, []);

  useWebSocket('/topic/map', handleMapUpdate);

  // Create custom icon for markers
  const createCustomIcon = (count: number) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <span class="text-white text-xs font-bold">${count}</span>
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bản đồ người dùng Online
        </h3>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bản đồ người dùng Online
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalOnline} người đang online
          </span>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
        <MapContainer
          center={[16.0, 107.0]} // Center of Vietnam
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Render markers for provinces with online users */}
          {onlineData.map((province, index) => (
            <React.Fragment key={index}>
              {/* Circle to highlight the area */}
              <Circle
                center={[province.latitude, province.longitude]}
                radius={province.onlineCount * 10000} // Radius based on online count
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2,
                }}
              />

              {/* Marker with count */}
              <Marker
                position={[province.latitude, province.longitude]}
                icon={createCustomIcon(province.onlineCount)}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {province.provinceName}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{province.onlineCount}</span> người đang online
                    </p>
                    {province.usernames.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <strong>Người dùng:</strong>
                        <ul className="mt-1 space-y-1">
                          {province.usernames.map((username, idx) => (
                            <li key={idx} className="truncate">• {username}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {onlineData.slice(0, 6).map((province, index) => (
          <div key={index} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {province.provinceName}
              </span>
            </div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {province.onlineCount}
            </span>
          </div>
        ))}
      </div>

      {onlineData.length === 0 && (
        <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          Hiện chưa có người dùng nào online
        </div>
      )}
    </div>
  );
};
