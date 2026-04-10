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

  const handleMapUpdate = useCallback((data: any) => {
    console.log('WS: Received map update', data);
    if (data.provinces) setOnlineData(data.provinces);
    if (data.totalOnline !== undefined) setTotalOnline(data.totalOnline);
  }, []);

  useWebSocket('/topic/map', handleMapUpdate);

  const createCustomIcon = (count: number) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative group">
          <div class="w-10 h-10 bg-gradient-to-tr from-fpt-orange to-orange-400 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white dark:border-zinc-900 transform transition-all duration-300 group-hover:scale-125 group-hover:rotate-6">
            <span class="text-white text-[10px] font-black tabular-nums">${count}</span>
          </div>
          <div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-400/50 rounded-full animate-ping"></div>
          <div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
          Bản đồ người dùng Online
        </h3>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Bản đồ người dùng Online
        </h3>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
          <div className="w-2 h-2 bg-fpt-orange rounded-full animate-pulse shadow-[0_0_8px_rgba(243,112,33,0.5)]"></div>
          <span className="text-[10px] font-black text-fpt-orange uppercase tracking-widest tabular-nums">
            {totalOnline} online
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6">
          {/* Leaflet Map */}
          <div className="relative h-96 rounded-[20px] overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-inner">
            <MapContainer
              center={[16.0, 107.0]} // Center of Vietnam
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {onlineData.map((province, index) => (
                <React.Fragment key={index}>
                  <Circle
                    center={[province.latitude, province.longitude]}
                    radius={province.onlineCount * 12000} 
                    pathOptions={{
                      color: '#F37021',
                      fillColor: '#F37021',
                      fillOpacity: 0.15,
                      weight: 1
                    }}
                  />

                  <Marker
                    position={[province.latitude, province.longitude]}
                    icon={createCustomIcon(province.onlineCount)}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <h4 className="font-bold text-gray-900 mb-1.5 border-b border-gray-100 pb-1.5">
                          {province.provinceName}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          <span className="text-fpt-orange font-bold tabular-nums">{province.onlineCount}</span> người đang online
                        </p>
                        {province.usernames.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar">
                            <ul className="space-y-1">
                              {province.usernames.map((username, idx) => (
                                <li key={idx} className="text-[10px] text-gray-500 flex items-center gap-1.5 truncate font-medium uppercase tracking-tight">
                                   <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                   {username}
                                </li>
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
            
            {/* Custom Overlay for map aesthetic */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-[20px]"></div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3">
            {onlineData.length === 0 ? (
                <div className="col-span-2 text-center text-[11px] font-medium text-gray-400 italic py-2">
                  Hiện chưa có người dùng nào online
                </div>
            ) : (
                onlineData.slice(0, 4).map((province, index) => (
                  <div key={index} className="flex items-center justify-between text-[11px] bg-gray-50/80 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-gray-100/50 dark:border-zinc-800 rounded-xl px-4 py-2.5 transition-all duration-300 shadow-sm hover:shadow-md group">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-fpt-orange rounded-full group-hover:scale-125 transition-transform"></div>
                      <span className="text-gray-900 dark:text-gray-300 font-bold truncate">
                        {province.provinceName}
                      </span>
                    </div>
                    <span className="text-fpt-orange font-black tabular-nums">
                      {province.onlineCount}
                    </span>
                  </div>
                ))
            )}
          </div>
      </div>
    </div>
  );
};

