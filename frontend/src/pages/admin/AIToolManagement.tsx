import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Database,
  CheckCircle2,
  Edit2,
  ChevronRight,
  AlertCircle,
  X,
  Loader2,
  Filter,
  Layers,
  MoreHorizontal,
  Info,
  Settings,
  Check,
  Play,
  Globe,
  Send,
  Clock,
  Activity
} from 'lucide-react';
import toast from "@utils/toast";
import { aiToolService, AITool, AIToolTest } from '../../services/api/aiToolService';
import { AdminLayout } from '../../components/admin/AdminLayout';

export const AIToolManagement: React.FC = () => {
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [formData, setFormData] = useState<Partial<AITool>>({
    name: '',
    type: 'SQL_TEMPLATE',
    description: '',
    sqlTemplate: '',
    accuracyPercentage: 100,
    isActive: true,
    allowedRoles: 'ADMIN,STUDENT,LECTURER,ACADEMIC_STAFF',
    requiredFields: '',
    requiredRespFields: ''
  });
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testingTool, setTestingTool] = useState<AITool | null>(null);
  const [, setRecentTests] = useState<AIToolTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // Workbench States
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'PARAMS' | 'BODY' | 'CONSOLE'>('PARAMS');
  const [testLogs, setTestLogs] = useState<string>('');
  const [latency, setLatency] = useState<number | null>(null);
  // const [knowledgeSource, setKnowledgeSource] = useState<KnowledgeSourcePayload | null>(null);
  // const [knowledgeContent, setKnowledgeContent] = useState('');
  // const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  // const [knowledgeSaving, setKnowledgeSaving] = useState(false);

  useEffect(() => {
    fetchTools();
    // fetchKnowledgeSource();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const data = await aiToolService.getAllTools();
      setTools(data);
    } catch (error) {
      toast.error('Không thể tải danh sách tools');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tool: AITool) => {
    try {
      await aiToolService.toggleStatus(tool.id!);
      toast.success(`${tool.isActive ? 'Đã vô hiệu hóa' : 'Đã kích hoạt'} tool ${tool.name}`);
      fetchTools();
    } catch (error) {
      toast.error('Thao tác thất bại');
    }
  };

  // const fetchKnowledgeSource = async () => {
  //   setKnowledgeLoading(true);
  //   try {
  //     const data = await aiToolService.getKnowledgeSource();
  //     setKnowledgeSource(data);
  //     setKnowledgeContent(data.content || '');
  //   } catch (error) {
  //     toast.error('Không thể tải nguồn tri thức FPTU');
  //     console.error(error);
  //   } finally {
  //     setKnowledgeLoading(false);
  //   }
  // };

  // const handleSaveKnowledgeSource = async () => {
  //   setKnowledgeSaving(true);
  //   try {
  //     const data = await aiToolService.updateKnowledgeSource(knowledgeContent);
  //     if (!data.success) {
  //       throw new Error(data.message || 'Không thể lưu nguồn tri thức');
  //     }
  //     setKnowledgeSource(data);
  //     setKnowledgeContent(data.content || knowledgeContent);
  //     toast.success('Đã cập nhật fptu-information.json');
  //   } catch (error: any) {
  //     toast.error(error?.message || 'Lưu nguồn tri thức thất bại');
  //   } finally {
  //     setKnowledgeSaving(false);
  //   }
  // };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingTool) {
        toast.error('Chỉ hỗ trợ cập nhật tool hiện có');
        return;
      }
      await aiToolService.updateTool(editingTool.id!, formData);
      toast.success('Cập nhật thành công');
      setIsModalOpen(false);
      setEditingTool(null);
      fetchTools();
    } catch (error) {
      toast.error('Lưu thông tin thất bại');
    }
  };

  const openEditModal = (tool: AITool) => {
    setEditingTool(tool);
    setFormData({
      ...tool,
      requiredFields: tool.requiredFields || '',
      requiredRespFields: tool.requiredRespFields || ''
    });
    setIsModalOpen(true);
  };

  const openTestModal = async (tool: AITool) => {
    setTestingTool(tool);
    // Initialize test params from required fields
    const initialParams: Record<string, any> = {};
    if (tool.requiredFields) {
      tool.requiredFields.split(',').forEach(field => {
        initialParams[field.trim()] = '';
      });
    }
    setTestParams(initialParams);
    setTestLogs('');
    setLatency(null);
    setIsTestModalOpen(true);
    fetchRecentTests(tool.id!);
  };

  const fetchRecentTests = async (toolId: number) => {
    try {
      const data = await aiToolService.getLatestTests(toolId);
      setRecentTests(data);
    } catch (error) {
      console.error('Failed to fetch tests', error);
    }
  };

  const handleParamChange = (key: string, value: any) => {
    setTestParams(prev => ({ ...prev, [key]: value }));
  };

  const handleRunTest = async () => {
    if (!testingTool) return;
    setIsTesting(true);
    setActiveTab('CONSOLE');
    setTestLogs('Initializing connection to Evaluator Service...\n');
    const loadingToast = toast.loading('Đang chạy giả lập hệ thống...');
    try {
      const response = await aiToolService.runTest(testingTool.id!, testParams);
      setTestLogs(response.logs || 'No logs received from service.');
      setLatency(response.executionTimeMs || 0);

      if (response.isPassed) {
        toast.success('Test hoàn tất. Hệ thống hoạt động chính xác!', { id: loadingToast });
      } else {
        toast.error('Test thất bại. Vui lòng kiểm tra lại tham số!', { id: loadingToast });
      }

      fetchRecentTests(testingTool.id!);
      fetchTools(); // Refresh main list to see updated accuracy
    } catch (error: any) {
      setTestLogs(prev => prev + `\n\n[ERROR] ${error?.message || 'Unknown error occurred'}`);
      toast.error('Lỗi khi chạy test', { id: loadingToast });
    } finally {
      setIsTesting(false);
    }
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || tool.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: tools.length,
    active: tools.filter(t => t.isActive).length,
    sql: tools.filter(t => t.type === 'SQL_TEMPLATE').length,
    backend: tools.filter(t => t.type === 'BACKEND_ACTION').length,
    nav: tools.filter(t => t.type === 'NAVIGATE_ONLY').length
  };

  const getToolTypeLabel = (type?: string) => {
    switch (type) {
      case 'SQL_TEMPLATE':
        return 'SQL Template';
      case 'BACKEND_ACTION':
        return 'Backend Action';
      case 'NAVIGATE_ONLY':
        return 'Navigation Path';
      default:
        return type || 'Không xác định';
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý AI Toolset">
      <div className="max-w-[1400px] mx-auto space-y-5 animate-in fade-in duration-500 pb-12 font-sans">

        {/* Header Section */}
        {/* <div className="bg-white rounded-[24px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-[#F47021] text-[10px] font-black tracking-widest uppercase mb-1">
              <Zap size={14} className="fill-[#F47021]" />
              AI INTELLIGENCE SYSTEMS
            </div>
            <div className="space-y-1.5">
              <h1 className="text-[32px] md:text-[40px] leading-tight font-extrabold text-slate-800 tracking-tight">
                Quản lý <span className="text-[#F47021]">AI Toolset</span>
              </h1>
              <p className="text-slate-500 text-[15px] max-w-2xl leading-relaxed">
                Hệ thống kiểm soát tập trung toàn bộ {stats.total} công cụ AI. Theo dõi trạng thái, quyền truy cập, tham số bắt buộc và chạy kiểm thử nhanh từ một giao diện gọn hơn.
              </p>
            </div>
          </div>

        </div> */}

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'TỔNG TOOLSET', val: stats.total, icon: <Layers />, bg: 'bg-blue-50 text-[#3B82F6]' },
            { label: 'HOẠT ĐỘNG', val: stats.active, icon: <CheckCircle2 />, bg: 'bg-green-50 text-[#10B981]' },
            { label: 'SQL TEMPLATES', val: stats.sql, icon: <Database />, bg: 'bg-purple-50 text-[#8B5CF6]' },
            { label: 'BACKEND ACTIONS', val: stats.backend, icon: <Settings />, bg: 'bg-amber-50 text-[#F59E0B]' },
            { label: 'NAVIGATION', val: stats.nav, icon: <ChevronRight />, bg: 'bg-cyan-50 text-[#06B6D4]' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/80 flex gap-4 items-center">
              <div className={`w-[48px] h-[48px] rounded-2xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                {React.cloneElement(stat.icon as React.ReactElement, { size: 22 })}
              </div>
              <div className="flex flex-col">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</div>
                <div className="text-[26px] font-black text-slate-800 tracking-tight leading-none mt-1">{stat.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-0 shadow-sm border-2 border-gray-100 dark:border-zinc-800 flex items-center justify-between overflow-hidden">
          <div className="flex-1 flex items-center h-[52px] px-4 relative">
            <Search size={18} className="text-slate-400 shrink-0 absolute left-4" />
            <input
              type="text"
              placeholder="Tìm tên tool, mô tả..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-transparent border-none focus:ring-0 text-[14px] pl-8 pr-4 py-2 outline-none text-slate-700 dark:text-zinc-200 placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-4 pr-3 shrink-0 h-[52px]">
            <div className="flex items-center gap-1.5 text-slate-400 border-r border-gray-100 dark:border-zinc-800 pr-4 h-6">
              <Filter size={14} />
              <span className="text-[10px] uppercase font-bold tracking-widest">PHÂN LOẠI:</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'SQL_TEMPLATE', label: 'SQL' },
                { id: 'BACKEND_ACTION', label: 'BACKEND' },
                { id: 'NAVIGATE_ONLY', label: 'NAVIGATION' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setFilterType(type.id);
                  }}
                  className={`h-9 px-4 rounded-xl text-[11px] font-bold tracking-wide transition-all active:scale-95 ${filterType === type.id
                    ? 'bg-fpt-orange text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>



        {/* <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/80 p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-widest">
                <Database size={14} />
                Nguồn Tri Thức FPTU
              </div>
              <h2 className="text-[20px] font-bold text-slate-900">Quản lý `fptu-information.json` cho `fpt_tool`</h2>
              <p className="text-[13px] text-slate-500 max-w-3xl">
                Admin có thể cập nhật trực tiếp handbook tri thức mà `fpt_tool` và `fptu_knowledge_lookup` dùng để trả lời cho sinh viên và giảng viên.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchKnowledgeSource}
                disabled={knowledgeLoading || knowledgeSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {knowledgeLoading ? 'Đang tải...' : 'Tải lại'}
              </button>
              <button
                type="button"
                onClick={handleSaveKnowledgeSource}
                disabled={knowledgeLoading || knowledgeSaving || !knowledgeContent.trim()}
                className="px-4 py-2 rounded-xl bg-[#F47021] text-white text-[12px] font-bold hover:bg-[#d85f18] disabled:opacity-60"
              >
                {knowledgeSaving ? 'Đang lưu...' : 'Lưu JSON'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Tệp nguồn</div>
              <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.filename || 'fptu-information.json'}</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Phiên bản</div>
              <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.summary?.version || '-'}</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Số Pillar</div>
              <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.summary?.pillarCount ?? '-'}</div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Dung lượng</div>
              <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.size ? `${knowledgeSource.size.toLocaleString()} bytes` : '-'}</div>
            </div>
          </div>

          {knowledgeSource?.path && (
            <div className="text-[12px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              Đường dẫn nguồn: <span className="font-semibold text-slate-700">{knowledgeSource.path}</span>
            </div>
          )}

          <textarea
            value={knowledgeContent}
            onChange={(e) => setKnowledgeContent(e.target.value)}
            rows={18}
            spellCheck={false}
            placeholder="JSON handbook cho fpt_tool..."
            className="w-full rounded-[18px] border border-slate-200 bg-slate-950 text-slate-100 px-4 py-4 font-mono text-[12px] leading-6 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F47021]"
          />

          <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-[13px] text-blue-900">
            <Info size={16} className="mt-0.5 shrink-0" />
            <div>
              `fpt_tool` và `fptu_knowledge_lookup` sẽ đọc nội dung mới ngay sau khi lưu. Backend quản lý tool giờ cũng cho phép admin nhìn thấy và chỉnh cấu hình các tool tri thức này trong cùng màn hình.
            </div>
          </div>
        </div> */}

        {/* Data Table */}
        <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/80 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest w-[18%]">Công cụ AI / Định danh</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest w-[22%]">Mô tả chức năng</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest w-[20%]">Tham số bắt buộc</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest w-[18%]">Quyền truy cập</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Độ tin cậy</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Trạng thái</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest text-right">Quản lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/80">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-[#F47021] animate-spin" />
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <AlertCircle className="w-10 h-10" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Không tìm thấy tool</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50/50 transition-colors group/row">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${tool.type === 'SQL_TEMPLATE' ? 'bg-purple-50 text-purple-600' :
                          tool.type === 'BACKEND_ACTION' ? 'bg-amber-50 text-amber-500' :
                            'bg-blue-50 text-blue-500'
                          }`}>
                          <ChevronRight size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-slate-800">{tool.name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{tool.type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2" title={tool.description}>
                        {tool.description}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      {tool.requiredFields ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tool.requiredFields.split(',').map((f, i) => (
                            <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded capitalize">
                              {f.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 italic text-[12px]">
                          <Info size={14} />
                          <span>Không có tham số</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {tool.allowedRoles?.split(',').map(role => (
                          <span key={role} className="px-2.5 py-1 bg-slate-100 text-[10px] font-bold rounded-md uppercase text-slate-700">
                            {role.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5 w-[80px]">
                        <span className="text-[12px] font-bold text-[#10B981]">{tool.accuracyPercentage}%</span>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                          <div
                            className="h-full bg-[#10B981] rounded-full"
                            style={{ width: `${tool.accuracyPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleToggleStatus(tool)}
                        className={`w-[44px] h-[24px] rounded-full p-1 transition-colors relative ${tool.isActive ? 'bg-[#10B981]' : 'bg-slate-200'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${tool.isActive ? 'translate-x-[20px]' : 'translate-x-0'
                          }`} />
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <div className="relative inline-block group/actions">
                        <button className="text-slate-300 hover:text-slate-500 p-2 transition-colors">
                          <MoreHorizontal size={24} />
                        </button>
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 bg-white shadow-lg border border-gray-100 rounded-xl flex items-center gap-1 px-1 py-1 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all duration-200 z-10 w-max translate-x-4 group-hover/actions:translate-x-0">
                          <button
                            onClick={() => openTestModal(tool)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Test Module"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(tool)}
                            className="p-2 text-fpt-orange hover:bg-orange-50 rounded-lg transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/80 p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-widest">
                <Database size={14} />
                Nguồn Tri Thức FPTU
              </div>
              <h2 className="text-[20px] font-bold text-slate-900">Quản lý `fptu-information.json` cho `fpt_tool`</h2>
              <p className="text-[13px] text-slate-500 max-w-3xl">
                Admin có thể cập nhật trực tiếp handbook tri thức mà `fpt_tool` và `fptu_knowledge_lookup` dùng để trả lời cho sinh viên và giảng viên.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchKnowledgeSource}
                disabled={knowledgeLoading || knowledgeSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {knowledgeLoading ? 'Đang tải...' : 'Tải lại'}
              </button>
              <button
                type="button"
                onClick={handleSaveKnowledgeSource}
                disabled={knowledgeLoading || knowledgeSaving || !knowledgeContent.trim()}
                className="px-4 py-2 rounded-xl bg-[#F47021] text-white text-[12px] font-bold hover:bg-[#d85f18] disabled:opacity-60"
              >
                {knowledgeSaving ? 'Đang lưu...' : 'Lưu JSON'}
              </button>
            </div>
          // </div> */}

        {/* // <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          //   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          //     <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Tệp nguồn</div>
          //     <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.filename || 'fptu-information.json'}</div>
          //   </div>
          //   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          //     <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Phiên bản</div>
          //     <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.summary?.version || '-'}</div>
          //   </div>
          //   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          //     <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Số Pillar</div>
          //     <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.summary?.pillarCount ?? '-'}</div>
          //   </div>
          //   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          //     <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Dung lượng</div>
          //     <div className="text-[14px] font-bold text-slate-800 mt-2">{knowledgeSource?.size ? `${knowledgeSource.size.toLocaleString()} bytes` : '-'}</div>
          //   </div>
          // </div> */}



        {/* <textarea
            value={knowledgeContent}
            onChange={(e) => setKnowledgeContent(e.target.value)}
            rows={18}
            spellCheck={false}
            placeholder="JSON handbook cho fpt_tool..."
            className="w-full rounded-[18px] border border-slate-200 bg-slate-950 text-slate-100 px-4 py-4 font-mono text-[12px] leading-6 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F47021]"
          />

          <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-[13px] text-blue-900">
            <Info size={16} className="mt-0.5 shrink-0" />
            <div>
              `fpt_tool` và `fptu_knowledge_lookup` sẽ đọc nội dung mới ngay sau khi lưu. Backend quản lý tool giờ cũng cho phép admin nhìn thấy và chỉnh cấu hình các tool tri thức này trong cùng màn hình.
            </div>
          </div>
        </div> */}

        {/* Create/Edit Modal */}
        {isModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
              <form onSubmit={handleSave} className="flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-[20px] font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 rounded-[12px] flex items-center justify-center text-[#F47021]">
                        <Edit2 size={20} />
                      </div>
                      Cập nhật Tool
                    </h3>
                    <p className="text-slate-500 dark:text-zinc-400 text-[13px] font-medium">
                      Thao tác cập nhật logic hệ thống
                    </p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="px-8 py-6 space-y-6 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Định danh Tool <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.name}
                        readOnly
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-[14px] px-4 py-3.5 outline-none font-semibold text-[14px] text-slate-700 dark:text-zinc-200"
                      />
                      <p className="text-[11px] text-slate-400 pl-1">Tên tool là inventory cố định, không chỉnh sửa tại UI.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Loại vận hành <span className="text-red-500">*</span></label>
                      <div className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-[14px] px-4 py-3.5 font-semibold text-[14px] text-slate-700 dark:text-zinc-200">
                        {getToolTypeLabel(formData.type)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Mô tả chức năng <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả cho LLM biết khi nào dùng tool này..."
                      className="w-full bg-white dark:bg-zinc-950 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl px-4 py-3 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 outline-none transition-all text-sm text-gray-900 dark:text-zinc-200 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1 flex justify-between">
                        Tham số bắt buộc
                      </label>
                      <input
                        type="text"
                        value={formData.requiredFields}
                        onChange={(e) => setFormData({ ...formData, requiredFields: e.target.value })}
                        placeholder="vd: student_code, class_name"
                        className="w-full h-[52px] bg-white dark:bg-zinc-950 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl px-4 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 outline-none transition-all font-bold text-sm text-gray-900 dark:text-zinc-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1 flex justify-between">
                        Tham số đầu ra bắt buộc
                      </label>
                      <input
                        type="text"
                        value={formData.requiredRespFields}
                        onChange={(e) => setFormData({ ...formData, requiredRespFields: e.target.value })}
                        placeholder="vd: student_name, status"
                        className="w-full h-[52px] bg-white dark:bg-zinc-950 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl px-4 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 outline-none transition-all font-semibold text-[14px] text-slate-800 dark:text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 rounded-[16px] p-5 border border-slate-100 dark:border-zinc-700">
                    <div className="flex-1 w-full max-w-[200px] space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Độ tin cậy</label>
                        <span className="text-[13px] font-black text-fpt-orange">{formData.accuracyPercentage}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.accuracyPercentage}
                        readOnly
                        disabled
                        className="w-full accent-fpt-orange h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-default opacity-70"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all ${formData.isActive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                        }`}
                    >
                      <span className="text-[13px] font-bold">{formData.isActive ? 'Đang bật' : 'Đang tắt'}</span>
                      <div className={`w-[36px] h-[20px] rounded-full p-[2px] transition-colors relative ${formData.isActive ? 'bg-[#10B981]' : 'bg-slate-300 dark:bg-zinc-600'}`}>
                        <div className={`w-[16px] h-[16px] bg-white rounded-full shadow-sm transition-transform ${formData.isActive ? 'translate-x-[16px]' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="px-8 py-5 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end gap-3 rounded-b-[24px]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-[44px] px-6 rounded-2xl text-slate-500 dark:text-zinc-400 font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-[13px] active:scale-95"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="h-[44px] bg-fpt-orange hover:bg-orange-600 text-white font-bold px-8 rounded-2xl shadow-lg shadow-fpt-orange/20 flex items-center gap-2 transition-all text-sm active:scale-95"
                  >
                    <Check size={16} />
                    Lưu công cụ
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Test Module Modal */}
        {isTestModalOpen && testingTool && createPortal((
          <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="bg-white w-full max-w-5xl rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">

                <div className="px-6 py-5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                      <Globe size={14} className="text-blue-500" />
                      <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Tool Test Lab</span>
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">
                        Kiểm thử <span className="text-blue-600">{testingTool.name}</span>
                      </h3>
                      <p className="text-[13px] text-slate-500">
                        Chạy mô phỏng nhanh với tham số đầu vào và theo dõi log xử lý theo thời gian thực.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTestModalOpen(false)}
                    className="w-9 h-9 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-colors text-slate-400 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-4 bg-slate-50/80 border-b border-gray-100 flex items-center gap-3 shrink-0">

                  <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-mono text-slate-500">
                    <span className="opacity-50">/api/v1/admin/ai-tools/</span>
                    <span className="text-blue-600 font-bold">{testingTool.id}</span>
                    <span className="opacity-50">/test</span>
                  </div>
                  <button
                    onClick={handleRunTest}
                    disabled={isTesting}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 shrink-0 min-w-[132px] justify-center"
                  >
                    {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>{isTesting ? 'Đang chạy...' : 'Chạy test'}</span>
                  </button>
                </div>

                <div className="px-6 py-4 bg-white border-b border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
                  <div className="rounded-2xl border border-gray-100 bg-slate-50/60 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Loại tool</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-700">{testingTool.type}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-slate-50/60 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Tham số bắt buộc</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-700">
                      {testingTool.requiredFields ? testingTool.requiredFields.split(',').length : 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-slate-50/60 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Tham số ra (Contract)</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-700">
                      {testingTool.requiredRespFields ? testingTool.requiredRespFields.split(',').length : 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-slate-50/60 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Độ tin cậy</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-700">{testingTool.accuracyPercentage}%</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-slate-50/60 px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">Trạng thái</div>
                    <div className={`mt-1 text-[13px] font-bold ${testingTool.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {testingTool.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="px-6 pt-2 bg-white border-b border-gray-100 flex items-center gap-6 shrink-0">
                    {[
                      { id: 'PARAMS', label: 'Params', icon: <Filter size={14} /> },
                      { id: 'BODY', label: 'Preview', icon: <Layers size={14} /> },
                      { id: 'CONSOLE', label: 'Logs', icon: <Activity size={14} /> }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-[12px] font-bold tracking-wide transition-all flex items-center gap-2 border-b-2 ${activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'PARAMS' && testingTool.requiredFields && (
                          <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[9px] flex items-center justify-center border border-blue-100">
                            {testingTool.requiredFields.split(',').length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar">
                    {activeTab === 'PARAMS' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Thông số kiểm thử</span>
                            <p className="mt-1 text-[13px] text-slate-500">Nhập đúng định dạng để mô phỏng gần nhất với runtime thật.</p>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                          <table className="w-full text-left text-[13px]">
                            <thead className="bg-slate-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[40%]">Trường</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Giá trị</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {testingTool.requiredFields ? (
                                testingTool.requiredFields.split(',').map((field) => {
                                  const key = field.trim();
                                  return (
                                    <tr key={key}>
                                      <td className="px-4 py-3 font-mono text-slate-700 bg-slate-50/70">{key}</td>
                                      <td className="px-0 py-0">
                                        <input
                                          type="text"
                                          value={testParams[key] || ''}
                                          onChange={(e) => handleParamChange(key, e.target.value)}
                                          placeholder={`Nhập ${key}...`}
                                          className="w-full bg-transparent px-4 py-3 border-none focus:ring-2 focus:ring-blue-500/10 outline-none text-slate-700 font-medium placeholder:text-slate-400"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500 italic">
                                    Tool này không yêu cầu tham số bắt buộc.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeTab === 'BODY' && (
                      <div className="h-full flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Payload preview</span>
                            <p className="mt-1 text-[13px] text-slate-500">Xem nhanh dữ liệu sẽ được gửi tới service test.</p>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">application/json</span>
                        </div>
                        <textarea
                          value={JSON.stringify(testParams, null, 2)}
                          readOnly
                          className="flex-1 min-h-[320px] bg-white border border-gray-200 rounded-2xl p-6 font-mono text-[14px] text-slate-600 outline-none"
                        />
                      </div>
                    )}

                    {activeTab === 'CONSOLE' && (
                      <div className="h-full flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nhật ký thực thi</span>
                            {isTesting && (
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] text-blue-500/80 font-bold animate-pulse uppercase tracking-wider">Đang xử lý...</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setTestLogs('')}
                            className="text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest bg-white px-3 py-1.5 rounded-md border border-gray-200 transition-colors"
                          >
                            Xóa log
                          </button>
                        </div>
                        <div className="flex-1 min-h-[320px] bg-[#0F172A] rounded-2xl p-6 font-mono text-[13px] text-emerald-300 overflow-y-auto border border-slate-800 relative group custom-scrollbar shadow-inner">
                          <pre className="whitespace-pre-wrap leading-relaxed">
                            <span className="text-slate-500 mr-2">$ evaluator --tool-id {testingTool.id}</span>
                            <br />
                            {testLogs || 'Sẵn sàng chạy kiểm thử...'}
                          </pre>
                          {!isTesting && testLogs && (
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-md border border-white/10 text-slate-200 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Check size={12} className="text-green-500" />
                                Hoàn tất
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${latency !== null ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`} />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Latency</span>
                        <span className="text-[12px] font-mono text-slate-700">{latency !== null ? `${latency}ms` : '--'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Activity size={14} className="text-slate-500" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Status</span>
                        <span className={`text-[12px] font-mono font-bold ${testLogs.includes('[ERROR]') ? 'text-red-500' : 'text-blue-600'}`}>
                          {isTesting ? 'BUSY' : testLogs ? (testLogs.includes('[ERROR]') ? 'FAILED' : 'SUCCESS') : 'IDLE'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={14} className="text-slate-500" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Accuracy Score</span>
                        <span className="text-[12px] font-mono text-slate-700 font-bold">{testingTool.accuracyPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsTestModalOpen(false)}
                      className="px-4 py-2 rounded-md text-[12px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ), document.body)}
      </div>
    </AdminLayout>
  );
};

