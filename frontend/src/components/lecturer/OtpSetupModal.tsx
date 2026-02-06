import React, { useState, useRef, useEffect } from 'react';
import { X, Shield, Lock, AlertCircle, Loader2, Check, ChevronRight } from 'lucide-react';
import { lecturerOtpService } from '../../services/api/lecturerOtpService';
import toast from 'react-hot-toast';

interface OtpSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isRegenerate?: boolean;
}

type Step = 'enter_otp' | 'confirm_otp';

export const OtpSetupModal: React.FC<OtpSetupModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    isRegenerate = false
}) => {
    const [step, setStep] = useState<Step>('enter_otp');
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [confirmOtp, setConfirmOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('enter_otp');
            setOtp(['', '', '', '', '', '']);
            setConfirmOtp(['', '', '', '', '', '']);
            setError(null);
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleInputChange = (
        index: number,
        value: string,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        if (value.length > 1) {
            value = value.slice(-1);
        }
        if (value && !/^\d$/.test(value)) {
            return;
        }

        setter(prev => {
            const newOtp = [...prev];
            newOtp[index] = value;
            return newOtp;
        });

        if (value && index < 5) {
            refs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
        values: string[]
    ) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) {
            refs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            refs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < 5) {
            refs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (
        e: React.ClipboardEvent,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData) {
            const newOtp = [...pastedData.split(''), ...Array(6 - pastedData.length).fill('')];
            setter(newOtp.slice(0, 6));
            const focusIndex = Math.min(pastedData.length - 1, 5);
            refs.current[focusIndex]?.focus();
        }
    };

    const handleNextStep = () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 số');
            return;
        }
        setError(null);
        setStep('confirm_otp');
        setTimeout(() => {
            confirmInputRefs.current[0]?.focus();
        }, 100);
    };

    const handleSubmit = async () => {
        const otpString = otp.join('');
        const confirmOtpString = confirmOtp.join('');

        if (confirmOtpString.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 số');
            return;
        }

        if (otpString !== confirmOtpString) {
            setError('Mã OTP không khớp. Vui lòng kiểm tra lại');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isRegenerate) {
                await lecturerOtpService.regenerateOtp(otpString);
                toast.success('Đổi mã OTP thành công!');
            } else {
                await lecturerOtpService.createOtp(otpString);
                toast.success('Tạo mã OTP thành công!');
            }
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const renderOtpInputs = (
        values: string[],
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => (
        <div className="flex justify-center gap-2 sm:gap-3">
            {values.map((digit, index) => (
                <input
                    key={index}
                    ref={el => refs.current[index] = el}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleInputChange(index, e.target.value, refs, setter)}
                    onKeyDown={e => handleKeyDown(index, e, refs, values)}
                    onPaste={e => handlePaste(e, refs, setter)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 rounded-xl 
                               bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                               border-gray-200 dark:border-zinc-600 
                               focus:border-fpt-orange focus:ring-2 focus:ring-fpt-orange/20 focus:outline-none
                               transition-all duration-200"
                    autoComplete="off"
                />
            ))}
        </div>
    );

    const getStepNumber = () => step === 'enter_otp' ? 1 : 2;

    const getStepLabel = () => step === 'enter_otp' ? 'Nhập mã OTP' : 'Xác nhận mã OTP';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-fpt-orange to-orange-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Shield className="text-white" size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {isRegenerate ? 'Đổi mã OTP' : 'Tạo mã OTP'}
                                </h2>
                                <p className="text-orange-100 text-xs">
                                    Bước {getStepNumber()}/2: {getStepLabel()}
                                </p>
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

                {/* Progress bar */}
                <div className="h-1 bg-gray-100 dark:bg-zinc-800">
                    <div
                        className="h-full bg-fpt-orange transition-all duration-300"
                        style={{ width: step === 'enter_otp' ? '50%' : '100%' }}
                    />
                </div>

                {/* Step Indicator */}
                <div className="px-6 py-4 flex items-center justify-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'enter_otp' ? 'bg-fpt-orange text-white' : 'bg-green-500 text-white'}`}>
                        {step !== 'enter_otp' ? <Check size={16} /> : '1'}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'confirm_otp' ? 'bg-fpt-orange text-white' : 'bg-gray-200 text-gray-500'}`}>
                        2
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-0">
                    {step === 'enter_otp' ? (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock className="text-fpt-orange" size={28} />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Nhập mã OTP 6 số mà bạn muốn sử dụng để xác thực khi nhập điểm
                                </p>
                            </div>

                            {renderOtpInputs(otp, inputRefs, setOtp)}

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <div className="flex gap-2">
                                    <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-blue-700 dark:text-blue-300">
                                        <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Mã OTP này sẽ được sử dụng mỗi khi bạn nhập/chỉnh sửa điểm</li>
                                            <li>Hãy ghi nhớ hoặc lưu trữ mã này ở nơi an toàn</li>
                                            <li>Bạn có thể đổi mã OTP bất cứ lúc nào</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="text-green-600" size={28} />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Nhập lại mã OTP để xác nhận
                                </p>
                            </div>

                            {renderOtpInputs(confirmOtp, confirmInputRefs, setConfirmOtp)}
                        </>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
                            <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    {step === 'confirm_otp' && (
                        <button
                            onClick={() => {
                                setStep('enter_otp');
                                setError(null);
                                setTimeout(() => inputRefs.current[0]?.focus(), 100);
                            }}
                            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 
                                       rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Quay lại
                        </button>
                    )}
                    <button
                        onClick={step === 'enter_otp' ? handleNextStep : handleSubmit}
                        disabled={loading || (step === 'enter_otp' ? otp.some(d => !d) : confirmOtp.some(d => !d))}
                        className="flex-1 py-3 px-4 bg-fpt-orange text-white rounded-xl font-medium 
                                   hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Đang xử lý...
                            </>
                        ) : step === 'enter_otp' ? (
                            'Tiếp tục'
                        ) : (
                            'Xác nhận'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
