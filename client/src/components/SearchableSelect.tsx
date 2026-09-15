import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number | undefined | null;
  onChange: (value: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  className?: string;
  id?: string;
  compact?: boolean;
  variant?: 'default' | 'compact' | 'table-cell';
  style?: React.CSSProperties;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search options...',
  disabled = false,
  clearable = true,
  searchable = true,
  className = '',
  id,
  compact = false,
  variant = 'default',
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownCoords, setDropdownCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = openUpwards
      ? Math.max(120, Math.min(spaceAbove - 12, 340))
      : Math.max(120, Math.min(spaceBelow - 12, 340));

    // Ensure adequate dropdown width for labels, especially in compact toolbars
    const width = Math.max(rect.width, compact || variant === 'compact' ? 200 : rect.width);
    let left = rect.left;
    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }

    setDropdownCoords({
      top: openUpwards ? undefined : rect.bottom + 4,
      bottom: openUpwards ? viewportHeight - rect.top + 4 : undefined,
      left,
      width,
      maxHeight,
      placement: openUpwards ? 'top' : 'bottom'
    });
  }, [compact, variant]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    } else {
      setDropdownCoords(null);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Selected option
  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  // Filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(term)) ||
      (o.badge && o.badge.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  // Reset highlight when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Handle outside click to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto focus search input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      id={id}
      className={`searchable-select-container ${compact || variant === 'compact' ? 'compact' : ''} variant-${variant} ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`searchable-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${variant === 'table-cell' ? 'table-cell-trigger' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`select-label ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="select-actions">
          {clearable && selectedOption && selectedOption.value !== '' && selectedOption.value !== 'ALL' && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="select-clear-btn"
              title="Clear filter"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            className={`select-chevron ${isOpen ? 'rotated' : ''}`}
          />
        </div>
      </button>

      {/* Floating Overlay Portal Menu (Rendered into document.body to avoid container clipping) */}
      {isOpen && dropdownCoords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`searchable-select-dropdown ${variant === 'table-cell' ? 'table-cell-dropdown' : ''} ${className ? `${className}-dropdown` : ''}`}
          style={{
            position: 'fixed',
            top: dropdownCoords.top !== undefined ? `${dropdownCoords.top}px` : undefined,
            bottom: dropdownCoords.bottom !== undefined ? `${dropdownCoords.bottom}px` : undefined,
            left: `${dropdownCoords.left}px`,
            right: 'auto',
            width: `${dropdownCoords.width}px`,
            maxHeight: `${dropdownCoords.maxHeight}px`,
            zIndex: 99999
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search Input (optional) */}
          {searchable && (
            <div className="select-search-box">
              <Search size={13} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="select-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            className="select-options-list"
            role="listbox"
            style={{
              maxHeight: searchable ? `${dropdownCoords.maxHeight - 45}px` : `${dropdownCoords.maxHeight - 10}px`,
              overflowY: 'auto'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="select-no-results">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption?.value === opt.value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    className={`select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${opt.disabled ? 'disabled' : ''}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <div className="option-content">
                      <div className="option-primary">
                        <span className="option-label">{opt.label}</span>
                        {opt.badge && (
                          <span className="option-badge">{opt.badge}</span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <div className="option-sublabel">{opt.sublabel}</div>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="option-check" />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
