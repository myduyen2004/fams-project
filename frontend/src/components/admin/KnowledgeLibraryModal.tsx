import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Loader2, Save, RefreshCw, ChevronRight,
  AlertTriangle, Lightbulb, Info, Phone, GraduationCap,
  Users, ArrowLeft, CheckCircle2
} from 'lucide-react';
import toast from '@utils/toast';
import { aiToolService, KnowledgeSourcePayload } from '../../services/api/aiToolService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: 'STUDENT' | 'LECTURER';
}

/* ── Tiny UI helpers ───────────────────────────────────────── */

const DetailList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2 pl-1">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2.5 text-[13px] text-slate-600 leading-relaxed">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F47021]/60 mt-2 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const TipBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex gap-3 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 text-[13px] text-amber-900">
    <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" /><span>{text}</span>
  </div>
);

const WarningBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex gap-3 bg-red-50 border border-red-200/60 rounded-xl px-4 py-3 text-[13px] text-red-800">
    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" /><span>{text}</span>
  </div>
);

const DataTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full text-[12px]">
      <thead><tr className="bg-slate-50 border-b border-slate-200">
        {headers.map((h, i) => <th key={i} className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, i) => <tr key={i} className="hover:bg-slate-50/50">
          {row.map((cell, j) => <td key={j} className="px-3 py-2.5 text-slate-600">{cell}</td>)}
        </tr>)}
      </tbody>
    </table>
  </div>
);

const ContactCard: React.FC<{ contact: any }> = ({ contact }) => (
  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1.5">
    <div className="font-bold text-[13px] text-slate-800 flex items-center gap-2">
      <Phone size={13} className="text-[#F47021]" />{contact.department}
    </div>
    <p className="text-[12px] text-slate-500">{contact.handles}</p>
    <p className="text-[12px] text-blue-600 font-medium">{contact.how}</p>
  </div>
);

/* ── Render any section's content as document ──────────────── */

const RenderSectionContent: React.FC<{ data: any }> = ({ data }) => {
  if (!data || typeof data !== 'object') return <p className="text-[13px] text-slate-500">{String(data ?? '')}</p>;

  return (
    <div className="space-y-3">
      {data.content && <p className="text-[13px] text-slate-600 leading-relaxed">{data.content}</p>}
      {data.description && <p className="text-[13px] text-slate-500">{data.description}</p>}
      {data.intro && <p className="text-[13px] text-slate-600 leading-relaxed">{data.intro}</p>}

      {data.contacts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.contacts.map((c: any, i: number) => <ContactCard key={i} contact={c} />)}
        </div>
      )}

      {data.details && Array.isArray(data.details) && <DetailList items={data.details} />}

      {data.table && <DataTable headers={data.table.headers} rows={data.table.rows} />}

      {data.subsections?.map((sub: any, i: number) => (
        <div key={i} className="space-y-2 pl-3 border-l-2 border-orange-200/60">
          <h4 className="text-[13px] font-bold text-slate-700">{sub.subtitle || sub.title}</h4>
          {sub.details && Array.isArray(sub.details) && <DetailList items={sub.details} />}
          {sub.table && <DataTable headers={sub.table.headers} rows={sub.table.rows} />}
          {sub.tip && <TipBox text={sub.tip} />}
          {sub.warning && <WarningBox text={sub.warning} />}
        </div>
      ))}

      {data.checklist && (
        <div className="bg-green-50 border border-green-200/60 rounded-xl p-4 space-y-2">
          <div className="text-[12px] font-bold text-green-700 uppercase tracking-wider">{data.checklist.title}</div>
          <ul className="space-y-1.5">
            {data.checklist.items?.map((item: string, i: number) => (
              <li key={i} className="flex gap-2 text-[12px] text-green-800"><span className="text-green-500 mt-0.5">✓</span><span>{item}</span></li>
            ))}
          </ul>
        </div>
      )}

      {data.tip && <TipBox text={data.tip} />}
      {data.warning && <WarningBox text={data.warning} />}

      {data.questions && (
        <div className="space-y-3">
          {data.questions.map((q: any, i: number) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[13px] font-bold text-slate-800">❓ {q.q}</p>
              <p className="text-[13px] text-slate-600 mt-1.5">{q.a}</p>
            </div>
          ))}
        </div>
      )}

      {data.terms && (
        <DataTable headers={['Thuật ngữ', 'Định nghĩa']} rows={data.terms.map((t: any) => [t.term, t.definition])} />
      )}
    </div>
  );
};

/* ── Build section list from parsed JSON ──────────────────── */

interface SectionItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  data: any;
  jsonPath: string; // dot-path for updating
}

function buildSections(parsed: any): SectionItem[] {
  if (!parsed) return [];
  const sections: SectionItem[] = [];
  const ic = 'info';
  const cl = 'bg-blue-50 text-blue-600';

  if (parsed.title || parsed.intro) {
    sections.push({ key: '__header', label: 'Giới thiệu chung', icon: ic, color: cl, data: { title: parsed.title, version: parsed.version, author: parsed.author, last_updated: parsed.last_updated, intro: parsed.intro }, jsonPath: '__header' });
  }
  if (parsed.quick_contacts) {
    sections.push({ key: 'quick_contacts', label: parsed.quick_contacts.title || 'Danh bạ liên hệ', icon: ic, color: cl, data: parsed.quick_contacts, jsonPath: 'quick_contacts' });
  }
  if (parsed.official_school_info) {
    sections.push({ key: 'official_school_info', label: 'Thông tin chính thức trường', icon: ic, color: cl, data: parsed.official_school_info, jsonPath: 'official_school_info' });
  }
  (parsed.pillars || []).forEach((pillar: any, pi: number) => {
    (pillar.groups || []).forEach((group: any, gi: number) => {
      sections.push({
        key: `pillar_${pi}_group_${gi}`,
        label: group.title || `Mục ${group.id}`,
        icon: ic,
        color: cl,
        data: group,
        jsonPath: `pillars.${pi}.groups.${gi}`,
      });
    });
  });
  if (parsed.faq) {
    sections.push({ key: 'faq', label: parsed.faq.title || 'FAQ', icon: ic, color: cl, data: parsed.faq, jsonPath: 'faq' });
  }
  if (parsed.glossary) {
    sections.push({ key: 'glossary', label: parsed.glossary.title || 'Thuật ngữ', icon: ic, color: cl, data: parsed.glossary, jsonPath: 'glossary' });
  }
  if (parsed.conclusion) {
    sections.push({ key: 'conclusion', label: 'Kết luận', icon: ic, color: cl, data: { conclusion: parsed.conclusion }, jsonPath: 'conclusion' });
  }
  return sections;
}

/* ── Set nested value by dot-path ─────────────────────────── */

function setNestedValue(obj: any, path: string, value: any): any {
  const clone = JSON.parse(JSON.stringify(obj));
  const parts = path.split('.');
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = isNaN(Number(parts[i])) ? parts[i] : Number(parts[i]);
    cur = cur[k];
  }
  const lastKey = isNaN(Number(parts[parts.length - 1])) ? parts[parts.length - 1] : Number(parts[parts.length - 1]);
  cur[lastKey] = value;
  return clone;
}

/* ══════════════════════════════════════════════════════════════
   SECTION DETAIL VIEW — always shows JSON editor + save button
   ══════════════════════════════════════════════════════════════ */

const SectionDetail: React.FC<{
  section: SectionItem;
  fullData: any;
  onBack: () => void;
  onSaved: (newFull: any) => void;
  role: string;
}> = ({ section, fullData, onBack, onSaved, role }) => {
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    setJsonText(JSON.stringify(section.data, null, 2));
    setJsonError('');
  }, [section]);

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try { JSON.parse(val); setJsonError(''); } catch (e: any) { setJsonError(e.message); }
  };

  const handleSave = async () => {
    let parsed: any;
    try { parsed = JSON.parse(jsonText); } catch { toast.error('JSON không hợp lệ!'); return; }

    setSaving(true);
    try {
      let newFull: any;
      if (section.jsonPath === '__header') {
        newFull = { ...JSON.parse(JSON.stringify(fullData)), ...parsed };
      } else if (section.jsonPath === 'conclusion') {
        newFull = { ...JSON.parse(JSON.stringify(fullData)), conclusion: parsed.conclusion };
      } else {
        newFull = setNestedValue(fullData, section.jsonPath, parsed);
      }

      const content = JSON.stringify(newFull, null, 2);
      const result = await aiToolService.updateKnowledgeSource(content, role);

      if (result.success === false) {
        toast.error((result as any).message || 'Lưu thất bại');
        return;
      }
      toast.success(`Đã cập nhật "${section.label}" thành công!`);
      onSaved(newFull);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Section header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', flexShrink: 0 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}><Info size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{section.label}</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', margin: '2px 0 0' }}>{section.jsonPath}</p>
        </div>
        {jsonError && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>⚠ JSON lỗi</span>}
      </div>

      {/* Scrollable content: doc view + JSON editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {/* Document-style view */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📄 Xem nội dung
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
            <RenderSectionContent data={section.data} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '2px dashed #e2e8f0', margin: '24px 0' }} />

        {/* JSON editor */}
        <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ✏️ Chỉnh sửa JSON — sửa trực tiếp bên dưới rồi bấm "Lưu cập nhật"
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 300,
            borderRadius: 16,
            border: jsonError ? '2px solid #ef4444' : '1px solid #e2e8f0',
            background: '#0F172A',
            color: '#6ee7b7',
            padding: '16px 20px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            lineHeight: '24px',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', fontSize: 12, color: '#1e40af', marginTop: 12 }}>
          <Info size={15} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Chỉ phần "<strong>{section.label}</strong>" được cập nhật. Các phần khác không bị ảnh hưởng.</span>
        </div>
      </div>

      {/* FOOTER — always visible, pinned at bottom */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        flexShrink: 0,
        borderRadius: '0 0 24px 24px',
      }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Quay lại
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !!jsonError}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: (saving || jsonError) ? '#d4d4d8' : '#F47021',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: (saving || jsonError) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(244,112,33,0.25)',
          }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Đang lưu...' : '💾 Lưu cập nhật'}
        </button>
      </div>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN MODAL
   ══════════════════════════════════════════════════════════════ */

export const KnowledgeLibraryModal: React.FC<Props> = ({ isOpen, onClose, role }) => {
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);
  const [knowledgeMeta, setKnowledgeMeta] = useState<KnowledgeSourcePayload | null>(null);

  const title = role === 'STUDENT' ? 'Thư viện Tài liệu Sinh viên' : 'Thư viện Tài liệu Giảng viên';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiToolService.getKnowledgeSource(role);
      setKnowledgeMeta(data);
      const parsed = JSON.parse(data.content || '{}');
      setParsedData(parsed);
      setSections(buildSections(parsed));
      setSelectedSection(null);
    } catch (error) {
      toast.error('Không thể tải tài liệu');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (isOpen) { fetchData(); }
  }, [isOpen, fetchData]);

  const handleSaved = (newFull: any) => {
    setParsedData(newFull);
    const newSections = buildSections(newFull);
    setSections(newSections);
    // Update current section data
    if (selectedSection) {
      const updated = newSections.find(s => s.key === selectedSection.key);
      if (updated) setSelectedSection(updated);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${role === 'STUDENT' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
              {role === 'STUDENT' ? <Users size={20} className="text-white" /> : <GraduationCap size={20} className="text-white" />}
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-[12px] text-slate-400 font-medium mt-0.5">
                {knowledgeMeta?.filename} · {knowledgeMeta?.size ? `${(knowledgeMeta.size / 1024).toFixed(1)} KB` : '...'} · {sections.length} phần
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Tải lại
            </button>
            <button onClick={onClose} className="w-9 h-9 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 text-[#F47021] animate-spin" />
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải tài liệu...</span>
            </div>
          ) : selectedSection ? (
            <SectionDetail
              section={selectedSection}
              fullData={parsedData}
              onBack={() => setSelectedSection(null)}
              onSaved={handleSaved}
              role={role}
            />
          ) : (
            /* Section list */
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="mb-4">
                <p className="text-[13px] text-slate-500">Chọn một phần bên dưới để xem nội dung chi tiết và chỉnh sửa. Mỗi phần có thể cập nhật riêng lẻ.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sections.map((sec) => (
                  <button
                    key={sec.key}
                    onClick={() => setSelectedSection(sec)}
                    className="group text-left bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-[#F47021]/40 hover:shadow-[0_4px_20px_rgba(244,112,33,0.06)] transition-all duration-200 active:scale-[0.98] flex items-center gap-4"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sec.color}`}>
                      <Info size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-slate-800 truncate group-hover:text-[#F47021] transition-colors">
                        {sec.label}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{sec.jsonPath}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-[#F47021] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer (only in list mode) */}
        {!selectedSection && !loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white rounded-b-[24px]">
            <div className="flex items-center gap-2 text-[12px] text-slate-400">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>{sections.length} phần có thể chỉnh sửa</span>
            </div>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-slate-500 hover:bg-slate-50 transition-colors">Đóng</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
