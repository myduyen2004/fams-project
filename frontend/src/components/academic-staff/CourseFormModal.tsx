import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Course, CourseCreateRequest } from '../../types/course';
import { courseService } from '../../services/api/courseService';
import toast from 'react-hot-toast';

interface CourseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    course?: Course | null;
}

const validationSchema = Yup.object({
    code: Yup.string()
        .trim()
        .matches(/^[a-zA-Z0-9-]+$/, 'Mã môn chỉ được chứa chữ cái, số và dấu gạch ngang')
        .matches(/[a-zA-Z]/, 'Mã môn phải chứa ít nhất một chữ cái')
        .max(20, 'Mã môn không được quá 20 ký tự')
        .required('Mã môn là bắt buộc'),
    name: Yup.string()
        .trim()
        .matches(/[a-zA-ZÀ-ỹ]/, 'Tên môn học phải chứa ít nhất một chữ cái')
        .min(5, 'Tên môn học phải có ít nhất 5 ký tự')
        .max(200, 'Tên môn học không được quá 200 ký tự')
        .required('Tên môn học là bắt buộc'),
    credits: Yup.number()
        .min(1, 'Số tín chỉ phải từ 1-10')
        .max(10, 'Số tín chỉ phải từ 1-10')
        .required('Số tín chỉ là bắt buộc'),
    numberOfSlots: Yup.number()
        .min(1, 'Số slot phải từ 1-100')
        .max(100, 'Số slot phải từ 1-100')
        .required('Số slot là bắt buộc'),
    description: Yup.string().max(500, 'Mô tả không được quá 500 ký tự')
});

export const CourseFormModal: React.FC<CourseFormModalProps> = ({ isOpen, onClose, onSuccess, course }) => {
    const [loading, setLoading] = useState(false);

    const formik = useFormik<CourseCreateRequest>({
        initialValues: {
            code: '',
            name: '',
            description: '',
            credits: 3,
            numberOfSlots: 45
        },
        validationSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                if (course) {
                    await courseService.updateCourse(course.id, values);
                    toast.success('Cập nhật môn học thành công');
                } else {
                    await courseService.createCourse(values);
                    toast.success('Tạo môn học thành công');
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
        if (course) {
            formik.setValues({
                code: course.code,
                name: course.name,
                description: course.description || '',
                credits: course.credits,
                numberOfSlots: course.numberOfSlots
            });
        } else {
            formik.resetForm();
        }
    }, [course, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {course ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mã môn *</label>
                        <input type="text" name="code" value={formik.values.code} onChange={formik.handleChange} onBlur={formik.handleBlur}
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-fpt-orange dark:border-zinc-700'}`} placeholder="VD: PRF192" />
                        {formik.touched.code && formik.errors.code && <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Tên môn học *</label>
                        <input type="text" name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-fpt-orange dark:border-zinc-700'}`} placeholder="VD: Programming Fundamentals" />
                        {formik.touched.name && formik.errors.name && <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Số tín chỉ *</label>
                            <input type="number" name="credits" value={formik.values.credits} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 dark:text-white ${formik.touched.credits && formik.errors.credits ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-fpt-orange dark:border-zinc-700'}`} min={1} max={10} />
                            {formik.touched.credits && formik.errors.credits && <p className="mt-1 text-xs text-red-500">{formik.errors.credits}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Số slot</label>
                            <input type="number" name="numberOfSlots" value={formik.values.numberOfSlots} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 dark:text-white ${formik.touched.numberOfSlots && formik.errors.numberOfSlots ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-fpt-orange dark:border-zinc-700'}`} min={1} max={100} />
                            {formik.touched.numberOfSlots && formik.errors.numberOfSlots && <p className="mt-1 text-xs text-red-500">{formik.errors.numberOfSlots}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mô tả</label>
                        <textarea name="description" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-fpt-orange focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" rows={3} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-zinc-300 dark:hover:bg-zinc-800">Hủy</button>
                        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fpt-orange rounded-lg hover:bg-orange-600 disabled:opacity-50">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {course ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
