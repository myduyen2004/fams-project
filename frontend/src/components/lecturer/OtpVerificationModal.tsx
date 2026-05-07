import React, { useState, useRef, useEffect } from 'react';
import { X, KeyRound, Loader2 } from 'lucide-react';
import { lecturerOtpService } from '../../services/api/lecturerOtpService';
import toast from "@utils/toast";

interface OtpVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setError(null);
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleInputChange = (index: number, value: string) => {
        if (value.length > 1) {
            value = value.slice(-1);
        }
        if (value && !/^\d$/.test(value)) {
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        if (e.key === 'Enter' && !otp.some(d => !d)) {
            handleSubmit();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData) {
            const newOtp = [...pastedData.split(''), ...Array(6 - pastedData.length).fill('')];
            setOtp(newOtp.slice(0, 6));
            const focusIndex = Math.min(pastedData.length - 1, 5);
            inputRefs.current[focusIndex]?.focus();
        }
    };

    const handleSubmit = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 số');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await lecturerOtpService.verifyOtp(otpString);
            toast.success('Xác thực thành công!');
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Mã OTP không chính xác');
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
                {/* Header - Changed to orange */}
                <div className="bg-gradient-to-r from-fpt-orange to-orange-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <KeyRound className="text-white" size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Xác thực OTP</h2>
                                <p className="text-orange-100 text-xs">Nhập mã OTP để tiếp tục</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="text-fpt-orange" size={28} />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Nhập mã OTP 6 số để xác thực và tiếp tục chỉnh sửa điểm
                        </p>
                    </div>

                    {/* OTP Inputs */}
                    <div className="flex justify-center gap-2 sm:gap-3">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleInputChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 rounded-xl 
                                           bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                                           transition-all duration-200 focus:outline-none
                                           ${error
                                        ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                        : 'border-gray-200 dark:border-zinc-600 focus:border-fpt-orange focus:ring-2 focus:ring-fpt-orange/20'
                                    }`}
                                autoComplete="off"
                            />
                        ))}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
                            <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer - Changed to orange */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 
                                   rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || otp.some(d => !d)}
                        className="flex-1 py-3 px-4 bg-fpt-orange text-white rounded-xl font-medium 
                                   hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Đang xác thực...
                            </>
                        ) : (
                            'Xác thực'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

