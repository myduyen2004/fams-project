import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { SubSpecialization, SubSpecializationCreateRequest } from '../../types/subspecialization';
import { subSpecializationService } from '../../services/api/subSpecializationService';
import toast from "@utils/toast";

interface SubSpecFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    specializationId: number;
    subSpec?: SubSpecialization | null;
}

const validationSchema = Yup.object({
    code: Yup.string()
        .trim()
        .matches(/^[a-zA-Z0-9-]+$/, 'Mã chỉ được chứa chữ cái, số và dấu gạch ngang')
        .matches(/[a-zA-Z]/, 'Mã phải chứa ít nhất một chữ cái')
        .max(20, 'Mã không được quá 20 ký tự')
        .required('Mã chuyên ngành hẹp là bắt buộc'),
    name: Yup.string()
        .trim()
        .matches(/[a-zA-ZÀ-ỹ]/, 'Tên phải chứa ít nhất một chữ cái')
        .max(200, 'Tên không được quá 200 ký tự')
        .required('Tên chuyên ngành hẹp là bắt buộc'),
    description: Yup.string().max(500, 'Mô tả không được quá 500 ký tự')
});

export const SubSpecFormModal: React.FC<SubSpecFormModalProps> = ({ isOpen, onClose, onSuccess, specializationId, subSpec }) => {
    const [loading, setLoading] = useState(false);

    const formik = useFormik<SubSpecializationCreateRequest>({
        initialValues: {
            code: '', name: '', description: '', specializationId
        },
        validationSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                if (subSpec) {
                    await subSpecializationService.updateSubSpecialization(subSpec.id, values);
                    toast.success('Cập nhật chuyên ngành hẹp thành công');
                } else {
                    await subSpecializationService.createSubSpecialization(values);
                    toast.success('Tạo chuyên ngành hẹp thành công');
                }
                onSuccess();
                onClose();
                formik.resetForm();
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        }
    });

    useEffect(() => {
        if (subSpec) {
            formik.setValues({ code: subSpec.code, name: subSpec.name, description: subSpec.description || '', specializationId });
        } else {
            formik.resetForm();
            formik.setFieldValue('specializationId', specializationId);
        }
    }, [subSpec, isOpen, specializationId]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 transform transition-all duration-300 scale-100 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {subSpec ? 'Chỉnh sửa chuyên ngành hẹp' : 'Thêm chuyên ngành hẹp'}
                    </h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>
                <form onSubmit={formik.handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Mã chuyên ngành hẹp *</label>
                        <input type="text" name="code" value={formik.values.code} onChange={formik.handleChange} onBlur={formik.handleBlur}
                            className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white'}`} placeholder="VD: SE-AI" />
                        {formik.touched.code && formik.errors.code && <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Tên chuyên ngành hẹp *</label>
                        <input type="text" name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                            className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white'}`} placeholder="VD: Công nghệ AI" />
                        {formik.touched.name && formik.errors.name && <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Mô tả</label>
                        <textarea name="description" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur}
                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 dark:bg-zinc-900 dark:text-white outline-none text-gray-900" rows={3} placeholder="Nhập mô tả chuyên ngành hẹp..." />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="h-[44px] px-6 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95">Hủy</button>
                        <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 h-[44px] px-8 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {subSpec ? 'Lưu thay đổi' : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

