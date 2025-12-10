'use client';

import { ReactNode } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLORS } from '@/lib/constants';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Footer options
  onSave?: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  showFooter?: boolean;
  cancelLabel?: string;
  // Size options
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  // Custom footer
  footer?: ReactNode;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * Reusable modal wrapper component
 * Provides consistent styling for modal header, content area, and footer
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saveLabel = 'Save',
  isSaving = false,
  showFooter = true,
  cancelLabel = 'Cancel',
  maxWidth = 'md',
  footer,
}: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative rounded-2xl w-full ${maxWidthClasses[maxWidth]} mx-4 overflow-hidden border border-purple-500/20`}
        style={{ backgroundColor: COLORS.MODAL_BG }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        {showFooter && (
          <div className="p-4 border-t border-gray-800 flex gap-3">
            {footer ? (
              footer
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  {cancelLabel}
                </Button>
                {onSave && (
                  <Button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      saveLabel
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Common form input component for modals
interface ModalInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'email';
  multiline?: boolean;
  rows?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  hint?: string;
}

export function ModalInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
  min,
  max,
  step,
  hint,
}: ModalInputProps) {
  const inputClasses = `w-full px-3 py-2 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors`;
  const inputStyle = { backgroundColor: COLORS.DARK_BG };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={`${inputClasses} resize-none`}
          style={inputStyle}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          style={inputStyle}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
        />
      )}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// Toggle switch component for modals
interface ModalToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ModalToggle({
  label,
  description,
  checked,
  onChange,
}: ModalToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-700'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
