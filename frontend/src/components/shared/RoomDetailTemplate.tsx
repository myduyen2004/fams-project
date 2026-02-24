import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Loader2, Box, Grid3X3, DoorOpen, Building2, Layers, Users } from 'lucide-react';
import { roomService } from '../../services/api/roomService';
import { Room } from '../../types/room';
import toast from 'react-hot-toast';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useTexture } from '@react-three/drei';
import { getRoomTypeLabel } from '../../utils/roomUtils';

interface Classroom3DProps {
    rows: number[];
    tablesPerRow: number[];
    isComputerLab: boolean;
}

const Classroom3D: React.FC<Classroom3DProps> = ({ rows, tablesPerRow, isComputerLab }) => {
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
                                    <boxGeometry args={[3.2, 0.05, 1.1]} />
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

                            {/* SEAT 1 (Left) & SEAT 2 (Right) logic remains the same... */}
                            {[-0.85, 0.85].map((sideOffset, idx) => (
                                <group key={`seat-${idx}`} position={[sideOffset, 0, 0]}>
                                    {/* Monitor - Only for COMPUTER_LAB */}
                                    {isComputerLab && (
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
                                    )}

                                    {/* Chair */}
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
                            ))}
                        </group>
                    );
                })
            ))}

            {/* TV / Large Screen */}
            <group position={[-7, 2.5, -9]}>
                {/* Viền bảng */}
                <mesh castShadow>
                    <boxGeometry args={[5, 2.8, 0.2]} />
                    <meshStandardMaterial
                        color="#989898ff"
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>

                {/* Mặt bảng/Màn hình */}
                <mesh position={[0, 0, 0.11]}>
                    <planeGeometry args={[4.8, 2.6]} />
                    <meshStandardMaterial color="#ffffffff" />
                </mesh>
            </group>

            <group position={[0, 2.5, -9]} scale={1.4}>
                <mesh castShadow>
                    <boxGeometry args={[5, 2.8, 0.2]} />
                    <meshStandardMaterial color="#1f2937" />
                </mesh>
                <mesh position={[0, 0, 0.11]}>
                    <planeGeometry args={[4.8, 2.6]} />
                    <meshStandardMaterial map={screenTexture} toneMapped={false} />
                </mesh>
            </group>

            <group position={[7, 2.5, -9]}>
                {/* Viền bảng */}
                <mesh castShadow>
                    <boxGeometry args={[5, 2.8, 0.2]} />
                    <meshStandardMaterial
                        color="#989898ff"
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>

                {/* Mặt bảng/Màn hình */}
                <mesh position={[0, 0, 0.11]}>
                    <planeGeometry args={[4.8, 2.6]} />
                    <meshStandardMaterial color="#ffffffff" />
                </mesh>
            </group>

            {/* Teacher's desk */}
            <group position={[7, 0, -6]} rotation={[0, Math.PI, 0]}>
                {/* Desk Surface */}
                <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
                    <boxGeometry args={[4, 0.05, 1.5]} />
                    <meshStandardMaterial color="#c8b97c" />
                </mesh>
                <mesh position={[0, 0.59, 0]}>
                    <boxGeometry args={[4.05, 0.04, 1.55]} />
                    <meshStandardMaterial color="#d1d5db" />
                </mesh>

                {/* Desk Legs (4 legs) */}
                <mesh position={[-1.9, 0.2, -0.65]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                <mesh position={[1.9, 0.2, -0.65]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                <mesh position={[-1.9, 0.2, 0.65]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                <mesh position={[1.9, 0.2, 0.65]} castShadow><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#9ca3af" /></mesh>

                <group position={[0, 0, 1]}>
                    <mesh position={[-0.25, 0.2, 0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                    <mesh position={[0.25, 0.2, 0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                    <mesh position={[-0.25, 0.2, -0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
                    <mesh position={[0.25, 0.2, -0.25]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#9ca3af" /></mesh>
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
        </>
    );
};

interface RoomDetailTemplateProps {
    Layout: React.ComponentType<{ children: React.ReactNode; pageTitle: string }>;
    basePath: string;
}

export const RoomDetailTemplate: React.FC<RoomDetailTemplateProps> = ({ Layout, basePath }) => {
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
            } catch {
                toast.error('Không thể tải thông tin phòng học');
                navigate(`${basePath}/rooms`);
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [id, navigate, basePath]);

    // Generate static layout data: 3 rows, 6 tables per row, 2 seats per table
    const rows = Array.from({ length: 3 }, (_, i) => i);
    const tablesPerRow = Array.from({ length: 6 }, (_, i) => i);

    if (loading) {
        return (
            <Layout pageTitle="Chi tiết phòng học">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                </div>
            </Layout>
        );
    }

    if (!room) {
        return (
            <Layout pageTitle="Chi tiết phòng học">
                <div className="text-center py-20 text-gray-500">Không tìm thấy phòng học</div>
            </Layout>
        );
    }

    const isComputerLab = room?.type === 'COMPUTER_LAB';
    const isClassroom = room?.type === 'CLASSROOM';

    return (
        <Layout pageTitle={`${room.name} - Mô phỏng`}>
            <div className="flex gap-6 h-[calc(100vh-140px)]">
                {/* Main Content - Simulation View */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 mb-1">
                                <Link to={`${basePath}/rooms`} className="hover:text-fpt-orange transition-colors">Phòng học</Link>
                                <ChevronRight size={14} />
                                <span className="text-fpt-orange font-medium">{room.name}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {room.name} - Mô phỏng
                            </h1>
                        </div>

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
                    </div>

                    {/* Seating Grid */}
                    <div className="flex-1 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl p-6 overflow-auto relative">
                        {!is3DMode ? (
                            /* 2D View */
                            <div className="flex flex-col gap-6 items-center pt-8">
                                {/* TV Screen - Front of Class */}
                                <div className="flex flex-row items-center mb-4 gap-4">
                                    <div className="w-64 h-32 bg-[#1f2937] rounded-lg border-4 border-gray-300 relative flex items-center justify-center shadow-xl">
                                        {/* Board Content */}
                                        <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden"></div>
                                    </div>
                                    <div className="w-64 h-32 bg-[#1f2937] rounded-lg border-4 border-gray-700 relative flex items-center justify-center shadow-xl">
                                        {/* Screen Content */}
                                        <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
                                            <img src="/assets/images/fpt-logo.png" className="w-32 h-auto object-contain" alt="Screen" />
                                        </div>
                                    </div>
                                    <div className="w-64 h-32 bg-[#1f2937] rounded-lg border-4 border-gray-300 relative flex items-center justify-center shadow-xl">
                                        {/* Board Content */}
                                        <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden"></div>
                                    </div>
                                </div>

                                {/* Teacher Desk */}
                                <div className="w-full flex justify-end pr-20 mb-8">
                                    <div className="flex flex-col items-center">
                                        {/* Chair - Behind the desk (closer to board) */}
                                        <div className="w-8 h-6 rounded-t-lg border border-gray-500 bg-[#1a1a1a] -mt-1"></div>
                                        {/* Desk Surface */}
                                        <div className="w-48 h-12 rounded-md shadow-lg border-2 z-10 bg-[#faf0c8] border-orange-200 dark:bg-orange-900/30 dark:border-orange-900/50"></div>
                                    </div>
                                </div>

                                {/* Rows */}
                                {rows.map((rowIndex) => (
                                    <div key={`row-${rowIndex}`} className="flex justify-center gap-8">
                                        {tablesPerRow.map((tableIndex) => (
                                            <div key={`table-${rowIndex}-${tableIndex}`} className="relative group transform transition-transform hover:scale-105 duration-200">
                                                <div className={`flex relative`}>
                                                    <div className={`absolute inset-x-0 top-0 h-12 rounded-md shadow-lg border-2 z-0 bg-[#faf0c8] border-orange-200 dark:bg-orange-900/30 dark:border-orange-900/50`}></div>
                                                    {[0, 1].map((seatIdx) => (
                                                        <div key={seatIdx} className="flex flex-col items-center z-10 w-16">
                                                            <div className="w-16 h-12 relative flex items-center justify-center">
                                                                {/* Monitor - Only for COMPUTER_LAB */}
                                                                {isComputerLab && (
                                                                    <div className="absolute top-1 left-3 w-6 h-4 bg-gray-900 rounded-sm border border-gray-700 flex items-center justify-center">
                                                                        <div className="w-full h-full bg-blue-900/20 rounded-[1px]"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="w-8 h-6 rounded-t-lg border border-gray-500 bg-[#1a1a1a] -mt-1"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* 3D View */
                            <div className="w-full h-full min-h-[400px]">
                                <Canvas shadows>
                                    <React.Suspense fallback={null}>
                                        <Classroom3D rows={rows} tablesPerRow={tablesPerRow} isComputerLab={isComputerLab} />
                                    </React.Suspense>
                                </Canvas>

                                {/* 3D Mode Instructions */}
                                <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                                    Kéo chuột trái để xoay • Cuộn chuột để zoom • Kéo chuột phải để di chuyển
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar - Room Info */}
                <div className="w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-y-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-xl ${isComputerLab ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' : isClassroom ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300' : 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-300'}`}>
                            <DoorOpen className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Thông tin phòng</h2>
                    </div>

                    <div className="space-y-4">
                        {[
                            { label: 'Mã phòng', val: room.code },
                            { label: 'Tên phòng', val: room.name },
                            { label: 'Loại phòng', val: getRoomTypeLabel(room.type), icon: DoorOpen },
                            { label: 'Tòa nhà', val: room.building, icon: Building2 },
                            { label: 'Tầng', val: `Tầng ${room.floor}`, icon: Layers },
                            { label: 'Sức chứa', val: `${room.capacity} người`, icon: Users }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                                {item.icon && (
                                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg">
                                        <item.icon className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-zinc-500 mb-1">{item.label}</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.val}</p>
                                </div>
                            </div>
                        ))}

                        {room.description && (
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                                <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">Mô tả</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {room.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};
