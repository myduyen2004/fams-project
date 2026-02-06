import React, { useState, useRef, useEffect } from 'react';
import { X, Shield, Lock, KeyRound, AlertCircle, Loader2, Check, ChevronRight } from 'lucide-react';
import { lecturerOtpService } from '../../services/api/lecturerOtpService';
import toast from 'react-hot-toast';

interface OtpChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'verify_old' | 'enter_new' | 'confirm_new';

export const OtpChangeModal: React.FC<OtpChangeModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [step, setStep] = useState<Step>('verify_old');
    const [oldOtp, setOldOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [newOtp, setNewOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [confirmOtp, setConfirmOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const oldInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const newInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('verify_old');
            setOldOtp(['', '', '', '', '', '']);
            setNewOtp(['', '', '', '', '', '']);
            setConfirmOtp(['', '', '', '', '', '']);
            setError(null);
            setTimeout(() => {
                oldInputRefs.current[0]?.focus();
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
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
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
            const newArr = [...pastedData.split(''), ...Array(6 - pastedData.length).fill('')];
            setter(newArr.slice(0, 6));
            const focusIndex = Math.min(pastedData.length - 1, 5);
            refs.current[focusIndex]?.focus();
        }
    };

    const handleVerifyOld = async () => {
        const otpString = oldOtp.join('');
        if (otpString.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 số');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await lecturerOtpService.verifyOtp(otpString);
            // Success - move to next step
            setStep('enter_new');
            setTimeout(() => newInputRefs.current[0]?.focus(), 100);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Mã OTP không chính xác');
            setOldOtp(['', '', '', '', '', '']);
            setTimeout(() => oldInputRefs.current[0]?.focus(), 100);
        } finally {
            setLoading(false);
        }
    };

    const handleEnterNew = () => {
        const otpString = newOtp.join('');
        if (otpString.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 số');
            return;
        }
        setError(null);
        setStep('confirm_new');
        setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
    };

    const handleConfirmNew = async () => {
        const newOtpString = newOtp.join('');
        const confirmOtpString = confirmOtp.join('');

        if (confirmOtpString.length !== 6) {
            setError('Vui lòng nhập đầy đủ 6 số');
            return;
        }

        if (newOtpString !== confirmOtpString) {
            setError('Mã OTP không khớp. Vui lòng kiểm tra lại');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await lecturerOtpService.regenerateOtp(newOtpString);
            toast.success('Đổi mã OTP thành công!');
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

    const getStepNumber = () => {
        switch (step) {
            case 'verify_old': return 1;
            case 'enter_new': return 2;
            case 'confirm_new': return 3;
        }
    };

    const getStepLabel = () => {
        switch (step) {
            case 'verify_old': return 'Xác thực OTP cũ';
            case 'enter_new': return 'Nhập OTP mới';
            case 'confirm_new': return 'Xác nhận OTP mới';
        }
    };

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
                                <h2 className="text-lg font-bold text-white">Đổi mã OTP</h2>
                                <p className="text-orange-100 text-xs">
                                    Bước {getStepNumber()}/3: {getStepLabel()}
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
                        style={{ width: `${(getStepNumber() / 3) * 100}%` }}
                    />
                </div>

                {/* Step Indicator */}
                <div className="px-6 py-4 flex items-center justify-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'verify_old' ? 'bg-fpt-orange text-white' : 'bg-green-500 text-white'}`}>
                        {step !== 'verify_old' ? <Check size={16} /> : '1'}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'enter_new' ? 'bg-fpt-orange text-white' : step === 'confirm_new' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {step === 'confirm_new' ? <Check size={16} /> : '2'}
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'confirm_new' ? 'bg-fpt-orange text-white' : 'bg-gray-200 text-gray-500'}`}>
                        3
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-0">
                    {step === 'verify_old' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <KeyRound className="text-blue-600" size={28} />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Nhập mã OTP hiện tại của bạn để xác thực
                                </p>
                            </div>
                            {renderOtpInputs(oldOtp, oldInputRefs, setOldOtp)}
                        </>
                    )}

                    {step === 'enter_new' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock className="text-fpt-orange" size={28} />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Nhập mã OTP mới 6 số mà bạn muốn sử dụng
                                </p>
                            </div>
                            {renderOtpInputs(newOtp, newInputRefs, setNewOtp)}

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <div className="flex gap-2">
                                    <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Hãy ghi nhớ hoặc lưu trữ mã OTP mới ở nơi an toàn
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'confirm_new' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="text-green-600" size={28} />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Nhập lại mã OTP mới để xác nhận
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
                    {step !== 'verify_old' && (
                        <button
                            onClick={() => {
                                if (step === 'enter_new') {
                                    setStep('verify_old');
                                    setTimeout(() => oldInputRefs.current[0]?.focus(), 100);
                                } else if (step === 'confirm_new') {
                                    setStep('enter_new');
                                    setTimeout(() => newInputRefs.current[0]?.focus(), 100);
                                }
                                setError(null);
                            }}
                            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 
                                       rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Quay lại
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (step === 'verify_old') handleVerifyOld();
                            else if (step === 'enter_new') handleEnterNew();
                            else handleConfirmNew();
                        }}
                        disabled={loading || (
                            step === 'verify_old' ? oldOtp.some(d => !d) :
                                step === 'enter_new' ? newOtp.some(d => !d) :
                                    confirmOtp.some(d => !d)
                        )}
                        className="flex-1 py-3 px-4 bg-fpt-orange text-white rounded-xl font-medium 
                                   hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Đang xử lý...
                            </>
                        ) : step === 'confirm_new' ? (
                            'Xác nhận đổi OTP'
                        ) : (
                            'Tiếp tục'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
