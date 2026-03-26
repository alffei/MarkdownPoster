/**
 * 模块说明：通用确认弹窗组件，统一风险操作的二次确认体验。
 */

import React, { useEffect, useState } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDarkMode: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDarkMode,
  confirmText = "确定",
  cancelText = "取消",
  confirmVariant = 'danger',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  const confirmClassName = confirmVariant === 'primary'
    ? 'px-4 py-2 text-sm font-bold text-white bg-[#0d6f66] hover:bg-[#0b6159] rounded-lg shadow-sm active:scale-95 transition-all'
    : 'px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm active:scale-95 transition-all';

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* 弹窗卡片 */}
      <div className={`relative w-full max-w-sm rounded-xl p-6 shadow-2xl transform transition-all duration-200 scale-100 ${
        isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
      } ${
        isDarkMode 
          ? 'bg-[#23272e] border border-[#3e4451] text-[#abb2bf]' 
          : 'bg-white border border-gray-100 text-gray-700'
      }`}>
        <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {message}
        </p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
              isDarkMode 
                ? 'border-transparent hover:bg-[#3e4451] text-gray-400' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={confirmClassName}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
