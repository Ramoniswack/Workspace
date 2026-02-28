'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ColorPicker } from './ColorPicker';
import { toast } from 'sonner';

interface CellEditorProps {
  value: any;
  color?: string;
  type: 'text' | 'link' | 'number';
  isEditing?: boolean;
  onValueChange: (value: any) => void;
  onColorChange: (color: string | null) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

/**
 * Optimized CellEditor component with React.memo
 * Prevents unnecessary re-renders for better performance with large tables
 */
export const CellEditor: React.FC<CellEditorProps> = React.memo(({
  value,
  color,
  type,
  isEditing: externalIsEditing,
  onValueChange,
  onColorChange,
  onEditStart,
  onEditEnd,
}) => {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const [localValue, setLocalValue] = useState(value ?? '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Check color contrast and determine if text should be dark or light
  const getTextColor = (bgColor?: string): string => {
    if (!bgColor) return 'inherit';
    
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return dark text for light backgrounds, light text for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const textColor = getTextColor(color);

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const validate = (val: any): boolean => {
    setError(null);

    if (!val && val !== 0) {
      return true; // Allow empty values
    }

    switch (type) {
      case 'number':
        if (isNaN(Number(val))) {
          setError('Must be a valid number');
          return false;
        }
        break;

      case 'link':
        try {
          new URL(val);
        } catch {
          setError('Must be a valid URL');
          return false;
        }
        break;
    }

    return true;
  };

  const handleSave = () => {
    if (validate(localValue)) {
      const finalValue = type === 'number' && localValue !== '' ? Number(localValue) : localValue;
      onValueChange(finalValue);
      if (externalIsEditing === undefined) {
        setInternalIsEditing(false);
      }
      onEditEnd?.();
    } else {
      // Show toast for validation error
      toast.error(error || 'Invalid value');
    }
  };

  const handleCancel = () => {
    setLocalValue(value ?? '');
    setError(null);
    if (externalIsEditing === undefined) {
      setInternalIsEditing(false);
    }
    onEditEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancel();
    }
  };

  const handleCellClick = () => {
    if (!isEditing) {
      if (externalIsEditing === undefined) {
        setInternalIsEditing(true);
      }
      onEditStart?.();
    }
  };

  const renderValue = () => {
    if (!value && value !== 0) {
      return <span className="text-gray-400" style={{ color: textColor === '#FFFFFF' ? '#D1D5DB' : undefined }}>Empty</span>;
    }

    if (type === 'link') {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          style={{ color: textColor === '#FFFFFF' ? '#93C5FD' : undefined }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Link to ${value}`}
        >
          {value}
        </a>
      );
    }

    return <span style={{ color: textColor }}>{value}</span>;
  };

  const renderEditor = () => {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type === 'number' ? 'number' : 'text'}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          placeholder={type === 'link' ? 'https://example.com' : 'Enter value'}
        />
        {error && (
          <span className="text-xs text-red-500 absolute -bottom-5 left-0">
            {error}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={cellRef}
      className="relative group h-full min-h-[48px] px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: color || 'transparent', contain: 'layout style paint' }}
      onClick={handleCellClick}
      role="button"
      aria-label={`Edit cell, current value: ${value || 'empty'}`}
    >
      <div className="flex-1 min-w-0">
        {isEditing ? renderEditor() : renderValue()}
      </div>

      <button
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        onClick={(e) => {
          e.stopPropagation();
          setShowColorPicker(!showColorPicker);
        }}
        aria-label="Change cell background color"
        title="Change color"
        tabIndex={-1}
      >
        <Palette className="h-4 w-4 text-gray-600 dark:text-gray-400" style={{ color: textColor === '#FFFFFF' ? '#D1D5DB' : undefined }} />
      </button>

      {showColorPicker && (
        <div className="absolute top-full left-0 z-50">
          <ColorPicker
            show={showColorPicker}
            currentColor={color}
            onColorSelect={(newColor) => {
              onColorChange(newColor);
              setShowColorPicker(false);
            }}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these props change
  return (
    prevProps.value === nextProps.value &&
    prevProps.color === nextProps.color &&
    prevProps.type === nextProps.type &&
    prevProps.isEditing === nextProps.isEditing
  );
});

CellEditor.displayName = 'CellEditor';
