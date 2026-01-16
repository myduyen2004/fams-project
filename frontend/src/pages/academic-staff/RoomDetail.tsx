import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Video, Wifi, ChevronRight, Loader2, Box, Grid3X3 } from 'lucide-react';
import { roomService } from '../../services/api/roomService';
import { Room } from '../../types/room';
import toast from 'react-hot-toast';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useTexture } from '@react-three/drei';

// Separate component for 3D content to allow using hooks like useTexture
const Classroom3D: React.FC<{ rows: number[], tablesPerRow: number[] }> = ({ rows, tablesPerRow }) => {
    // Load FPT Logo Texture
    const screenTexture = useTexture('/assets/images/fpt-logo.png');

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 10, 15]} fov={50} />
            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2 - 0.1}
                minDistance={5}
                maxDistance={20}
            />

            {/* Lighting */}
            <ambientLight intensity={1.5} />
            <Environment preset="city" />
            <directionalLight
                position={[5, 10, 5]}
                intensity={2}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <pointLight position={[-10, 10, -10]} intensity={0.3} />

            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                <planeGeometry args={[30, 20]} />
                <meshStandardMaterial color="#e5e7eb" />
            </mesh>

            {/* 3D Tables */}
            {rows.map((rowIndex) => (
                tablesPerRow.map((tableIndex) => {
                    const xOffset = (tableIndex - 2.5) * 3.4;
                    const zOffset = (rowIndex - 1) * 3.5;

                    const DESK_COLOR = '#c8b97c'; // Beige
                    const BORDER_COLOR = '#d1d5db'; // Gray-300

                    return (
                        <group key={`table-3d-${rowIndex}-${tableIndex}`} position={[xOffset, 0, zOffset]}>
                            {/* LONG DESK (Merged 2 desks) */}
                            <group position={[0, 0, 0]}>
                                {/* Desk Surface - Wide for 2 seats */}
                                <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
                                    <boxGeometry args={[3.2, 0.05, 1.1]} /> {/* Widened from 1.5 to 3.2 */}
                                    <meshStandardMaterial color={DESK_COLOR} />
                                </mesh>
                                <mesh position={[0, 0.59, 0]}>
                                    <boxGeometry args={[3.25, 0.04, 1.15]} />
                                    <meshStandardMaterial color={BORDER_COLOR} />
                                </mesh>

                                {/* Desk Legs (4 legs for the long table) */}
                                <mesh position={[-1.5, 0.2, -0.45]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                <mesh position={[1.5, 0.2, -0.45]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                <mesh position={[-1.5, 0.2, 0.45]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                <mesh position={[1.5, 0.2, 0.45]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                            </group>

                            {/* SEAT 1 (Left) - Always rendered fully */}
                            <group position={[-0.85, 0, 0]}>
                                {/* Monitor */}
                                <group position={[-0.35, 0.65, -0.25]}>
                                    <mesh position={[0, 0.25, 0]} castShadow>
                                        <boxGeometry args={[0.5, 0.35, 0.05]} />
                                        <meshStandardMaterial color="#111827" />
                                    </mesh>
                                    <mesh position={[0, 0.05, 0]}>
                                        <boxGeometry args={[0.1, 0.1, 0.05]} />
                                        <meshStandardMaterial color="#374151" />
                                    </mesh>
                                </group>

                                {/* Chair - Always Black Cushioned */}
                                <group position={[0, 0, 0.7]}>
                                    <mesh position={[-0.25, 0.2, -0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[0.25, 0.2, -0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[-0.25, 0.2, 0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[0.25, 0.2, 0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[0, 0.42, 0]} castShadow>
                                        <boxGeometry args={[0.6, 0.05, 0.6]} />
                                        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
                                    </mesh>
                                    <mesh position={[-0.25, 0.7, 0.28]} rotation={[0, 0, 0]}>
                                        <boxGeometry args={[0.05, 0.6, 0.05]} />
                                        <meshStandardMaterial color="#9ca3af" />
                                    </mesh>
                                    <mesh position={[0.25, 0.7, 0.28]} rotation={[0, 0, 0]}>
                                        <boxGeometry args={[0.05, 0.6, 0.05]} />
                                        <meshStandardMaterial color="#9ca3af" />
                                    </mesh>
                                    <mesh position={[0, 0.85, 0.25]} castShadow>
                                        <boxGeometry args={[0.6, 0.25, 0.05]} />
                                        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
                                    </mesh>
                                </group>
                            </group>

                            {/* SEAT 2 (Right) - Always rendered fully */}
                            <group position={[0.85, 0, 0]}>
                                {/* Monitor */}
                                <group position={[-0.35, 0.65, -0.25]}>
                                    <mesh position={[0, 0.25, 0]} castShadow>
                                        <boxGeometry args={[0.5, 0.35, 0.05]} />
                                        <meshStandardMaterial color="#111827" />
                                    </mesh>
                                    <mesh position={[0, 0.05, 0]}>
                                        <boxGeometry args={[0.1, 0.1, 0.05]} />
                                        <meshStandardMaterial color="#374151" />
                                    </mesh>
                                </group>

                                {/* Chair - Always Black Cushioned */}
                                <group position={[0, 0, 0.7]}>
                                    <mesh position={[-0.25, 0.2, -0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[0.25, 0.2, -0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[-0.25, 0.2, 0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[0.25, 0.2, 0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                                    <mesh position={[0, 0.42, 0]} castShadow>
                                        <boxGeometry args={[0.6, 0.05, 0.6]} />
                                        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
                                    </mesh>
                                    <mesh position={[-0.25, 0.7, 0.28]} rotation={[0, 0, 0]}>
                                        <boxGeometry args={[0.05, 0.6, 0.05]} />
                                        <meshStandardMaterial color="#9ca3af" />
                                    </mesh>
                                    <mesh position={[0.25, 0.7, 0.28]} rotation={[0, 0, 0]}>
                                        <boxGeometry args={[0.05, 0.6, 0.05]} />
                                        <meshStandardMaterial color="#9ca3af" />
                                    </mesh>
                                    <mesh position={[0, 0.85, 0.25]} castShadow>
                                        <boxGeometry args={[0.6, 0.25, 0.05]} />
                                        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
                                    </mesh>
                                </group>
                            </group>
                        </group>
                    );
                })
            ))}

            {/* TV / Large Screen */}
            <group position={[0, 2.5, -9]}>
                <mesh castShadow>
                    <boxGeometry args={[5, 2.8, 0.2]} />
                    <meshStandardMaterial color="#1f2937" />
                </mesh>
                <mesh position={[0, 0, 0.11]}>
                    <planeGeometry args={[4.8, 2.6]} />
                    <meshStandardMaterial map={screenTexture} toneMapped={false} />
                </mesh>
                <mesh position={[0, -2, -0.1]}>
                    <cylinderGeometry args={[0.2, 0.4, 2]} />
                    <meshStandardMaterial color="#374151" />
                </mesh>
                <mesh position={[0, -3.1, -0.1]}>
                    <boxGeometry args={[2, 0.2, 1]} />
                    <meshStandardMaterial color="#374151" />
                </mesh>
            </group>

            {/* Teacher's desk */}
            <mesh position={[0, 0.5, -7]} castShadow>
                <boxGeometry args={[4, 0.2, 1.5]} />
                <meshStandardMaterial color="#f3e5ab" />
            </mesh>
            <mesh position={[0, 0.25, -7]} castShadow>
                <boxGeometry args={[0.2, 0.5, 1.2]} />
                <meshStandardMaterial color="#6b7280" />
            </mesh>
        </>
    );
};

export const RoomDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [is3DMode, setIs3DMode] = useState(false);

    useEffect(() => {
        const fetchRoom = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await roomService.getRoom(parseInt(id));
                setRoom(data);
            } catch (error) {
                toast.error('Không thể tải thông tin phòng học');
                navigate('/academic-staff/rooms');
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [id, navigate]);

    // Generate static layout data: 3 rows, 6 tables per row, 2 seats per table
    const rows = Array.from({ length: 3 }, (_, i) => i);
    const tablesPerRow = Array.from({ length: 6 }, (_, i) => i);

    if (loading) {
        return (
            <AcademicStaffLayout pageTitle="Chi tiết phòng học">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                </div>
            </AcademicStaffLayout>
        );
    }

    if (!room) {
        return (
            <AcademicStaffLayout pageTitle="Chi tiết phòng học">
                <div className="text-center py-20 text-gray-500">Không tìm thấy phòng học</div>
            </AcademicStaffLayout>
        );
    }

    return (
        <AcademicStaffLayout pageTitle={`${room.name} - Mô phỏng`}>
            <div className="flex gap-6 h-[calc(100vh-140px)]">
                {/* Main Content - Simulation View */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 mb-1">
                                <Link to="/academic-staff/rooms" className="hover:text-fpt-orange transition-colors">Phòng học</Link>
                                <ChevronRight size={14} />
                                <span className="text-fpt-orange font-medium">{room.name}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {room.name} - Mô phỏng
                            </h1>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIs3DMode(!is3DMode)}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${is3DMode
                                    ? 'bg-fpt-orange text-white border-fpt-orange hover:bg-orange-600'
                                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                {is3DMode ? <Grid3X3 size={16} /> : <Box size={16} />}
                                {is3DMode ? 'Chế độ 2D' : 'Chế độ 3D'}
                            </button>
                            <button className="px-4 py-2 bg-fpt-orange hover:bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-500/20 text-sm font-medium transition-all flex items-center gap-2">
                                <Video size={16} /> Phát trực tiếp
                            </button>
                        </div>
                    </div>

                    {/* Seating Grid - 3 dãy (hàng ngang), mỗi dãy 6 bàn */}
                    <div className="flex-1 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl p-6 overflow-auto">
                        {!is3DMode ? (
                            /* 2D View */
                            <div className="flex flex-col gap-16 items-center pt-8">
                                {/* TV Screen - Front of Class */}
                                <div className="flex flex-col items-center mb-4">
                                    <div className="w-64 h-32 bg-[#1f2937] rounded-lg border-4 border-gray-700 relative flex items-center justify-center shadow-xl">
                                        {/* Screen Content */}
                                        <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
                                            <img src="/assets/images/fpt-logo.png" className="w-32 h-auto object-contain" alt="Screen" />
                                        </div>
                                    </div>
                                    {/* Stand */}
                                    <div className="w-8 h-8 bg-gray-700"></div>
                                    <div className="w-32 h-2 bg-gray-700 rounded-full"></div>
                                </div>

                                {/* 3 rows */}
                                {rows.map((rowIndex) => (
                                    <div key={`row-${rowIndex}`} className="flex justify-center gap-8">
                                        {/* 6 tables per row */}
                                        {tablesPerRow.map((tableIndex) => {
                                            return (
                                                <div key={`table-${rowIndex}-${tableIndex}`} className="relative group transform transition-transform hover:scale-105 duration-200">
                                                    {/* Table with 2 seats side by side */}
                                                    <div className="flex gap-0">
                                                        {/* Single Long Desk Container */}
                                                        <div className="flex relative">
                                                            {/* Long Desk Surface - Lighter Beige to match 3D lighting */}
                                                            <div className="absolute inset-x-0 top-0 h-12 bg-[#faf0c8] rounded-md shadow-lg border-2 border-gray-300 dark:border-zinc-700 z-0"></div>

                                                            {/* Seat 1 */}
                                                            <div className="flex flex-col items-center z-10 w-16">
                                                                <div className="w-16 h-12 relative flex items-center justify-center">
                                                                    {/* Monitor always visible */}
                                                                    <div className="absolute top-1 left-3 w-6 h-4 bg-gray-900 rounded-sm border border-gray-700 flex items-center justify-center">
                                                                        <div className="w-full h-full bg-blue-900/20 rounded-[1px]"></div>
                                                                    </div>
                                                                </div>
                                                                {/* Chair - Always Black */}
                                                                <div className="w-8 h-6 rounded-t-lg border border-gray-500 bg-[#1a1a1a] -mt-1"></div>
                                                            </div>

                                                            {/* Seat 2 */}
                                                            <div className="flex flex-col items-center z-10 w-16">
                                                                <div className="w-16 h-12 relative flex items-center justify-center">
                                                                    {/* Monitor always visible */}
                                                                    <div className="absolute top-1 left-3 w-6 h-4 bg-gray-900 rounded-sm border border-gray-700 flex items-center justify-center">
                                                                        <div className="w-full h-full bg-blue-900/20 rounded-[1px]"></div>
                                                                    </div>
                                                                </div>
                                                                {/* Chair - Black*/}
                                                                <div className="w-8 h-6 rounded-t-lg border border-gray-500 bg-[#1a1a1a] -mt-1"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* 3D View - OrbitControls với góc nhìn giới hạn */
                            <div className="w-full h-full min-h-[400px]">
                                <Canvas shadows>
                                    <React.Suspense fallback={null}>
                                        <Classroom3D rows={rows} tablesPerRow={tablesPerRow} />
                                    </React.Suspense>
                                </Canvas>

                                {/* 3D Mode Instructions */}
                                <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                    🖱️ Kéo chuột trái để xoay • Cuộn chuột để zoom • Kéo chuột phải để di chuyển
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Legend - Removed specific statuses since visual is unified */}
                </div>

                {/* Sidebar - Room Info */}
                <div className="w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Thông tin {room.name}</h2>
                        <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> TRỰC TIẾP
                        </span>
                    </div>

                    {/* Attendance Setup Section */}
                    <div className="space-y-5">
                        <h3 className="text-xs font-bold text-fpt-orange uppercase tracking-wider flex items-center gap-2">
                            <Wifi size={14} /> Cấu hình Điểm danh
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tên SSID</label>
                                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 font-mono text-sm text-gray-700 dark:text-gray-300">
                                    EDU_SMART_5G
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">BSSID (Địa chỉ MAC)</label>
                                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 font-mono text-sm text-gray-700 dark:text-gray-300">
                                    00:1A:2B:3C:4D:5E
                                </div>
                            </div>

                            {/* Signal Stability Chart */}
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Độ ổn định tín hiệu</span>
                                    <span className="text-emerald-500 font-bold text-sm">-54 dBm</span>
                                </div>
                                <div className="h-16 flex items-end gap-1">
                                    {[35, 50, 40, 60, 45, 70, 55, 85, 65, 45].map((h, i) => (
                                        <div
                                            key={i}
                                            style={{ height: `${h}%` }}
                                            className={`flex-1 rounded-t transition-all duration-300 ${i === 7 ? 'bg-fpt-orange' : 'bg-orange-200 dark:bg-orange-900/50'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Signal Threshold */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Ngưỡng tín hiệu</span>
                                    <span className="font-bold text-gray-900 dark:text-white">-75 dBm</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="-30"
                                    defaultValue="-75"
                                    className="w-full h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-fpt-orange"
                                />
                            </div>

                            {/* Location-based Toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Dựa trên vị trí</span>
                                    <span className="text-[10px] text-gray-500">Yêu cầu vùng nghiêm ngặt</span>
                                </div>
                                <div className="w-11 h-6 bg-fpt-orange rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                </div>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-fpt-orange hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 mt-4">
                            Áp dụng thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </AcademicStaffLayout>
    );
};
