'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Lock, Users, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CellEditor } from './CellEditor';
import { ColorPicker } from './ColorPicker';
import { ExportButton } from './ExportButton';
import { UpgradePrompt } from '@/components/roles/UpgradePrompt';
import { TableMemberManagement } from '@/components/TableMemberManagement';
import { DeleteColumnModal } from '@/components/modals/DeleteColumnModal';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useCustomTable } from '@/hooks/useCustomTable';
import { IColumn, IRow } from '@/types/pro-features';
import { toast } from 'sonner';

interface CustomTableViewProps {
  spaceId: string;
  tableId: string;
  workspaceId: string;
}

export const CustomTableView: React.FC<CustomTableViewProps> = ({ tableId, spaceId, workspaceId }) => {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showDeleteColumnModal, setShowDeleteColumnModal] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string; number: number } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set()); // Set of "rowId-colId"
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ rowId: string; colId: string } | null>(null);
  const [userPermission, setUserPermission] = useState<'FULL' | 'EDIT' | 'VIEW' | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const { usage, limits, canAddRow, canAddColumn } = useEntitlements();
  const { table, loading, saving, updateCell, updateCellColor, addRow, deleteRow, addColumn, deleteColumn } = useCustomTable(tableId);

  // Update user permission when table loads
  useEffect(() => {
    if (table && (table as any).userPermission) {
      setUserPermission((table as any).userPermission);
    }
  }, [table]);

  // Check if user can perform actions
  const canEdit = userPermission === 'EDIT' || userPermission === 'FULL';
  const canFullAccess = userPermission === 'FULL';

  // Announce cell updates to screen readers
  const announceCellUpdate = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
      // Clear after a short delay
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (!table || editingCell) return;

    const maxRowIndex = table.rows.length - 1;
    const maxColIndex = table.columns.length - 1;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedCell({ rowIndex: rowIndex - 1, colIndex });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < maxRowIndex) {
          setFocusedCell({ rowIndex: rowIndex + 1, colIndex });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setFocusedCell({ rowIndex, colIndex: colIndex - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < maxColIndex) {
          setFocusedCell({ rowIndex, colIndex: colIndex + 1 });
        }
        break;
      case 'Enter':
        e.preventDefault();
        const row = table.rows[rowIndex];
        const col = table.columns[colIndex];
        setEditingCell({ rowId: row.id, colId: col.id });
        break;
      case 'Tab':
        // Let default Tab behavior work, but update focus tracking
        if (e.shiftKey) {
          if (colIndex > 0) {
            e.preventDefault();
            setFocusedCell({ rowIndex, colIndex: colIndex - 1 });
          } else if (rowIndex > 0) {
            e.preventDefault();
            setFocusedCell({ rowIndex: rowIndex - 1, colIndex: maxColIndex });
          }
        } else {
          if (colIndex < maxColIndex) {
            e.preventDefault();
            setFocusedCell({ rowIndex, colIndex: colIndex + 1 });
          } else if (rowIndex < maxRowIndex) {
            e.preventDefault();
            setFocusedCell({ rowIndex: rowIndex + 1, colIndex: 0 });
          }
        }
        break;
    }
  }, [table, editingCell]);

  const handleCellUpdate = useCallback((rowId: string, colId: string, value: any) => {
    if (!canEdit) return; // Check permission before updating
    updateCell(rowId, colId, value);
    setEditingCell(null);
    
    // Find column name for announcement
    const column = table?.columns.find(c => c.id === colId);
    if (column) {
      announceCellUpdate(`Cell updated: ${column.title} set to ${value}`);
    }
  }, [updateCell, table, announceCellUpdate, canEdit]);

  const handleColorUpdate = useCallback((rowId: string, colId: string, color: string | null) => {
    if (!canEdit) return;
    updateCellColor(rowId, colId, color);
    
    const column = table?.columns.find(c => c.id === colId);
    if (column) {
      announceCellUpdate(`Cell color ${color ? 'changed' : 'removed'} for ${column.title}`);
    }
  }, [updateCellColor, table, announceCellUpdate, canEdit]);

  const handleCellClick = useCallback((rowId: string, colId: string, e: React.MouseEvent) => {
    const cellKey = `${rowId}-${colId}`;
    
    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
    } else {
      // Single select - start drag selection
      setSelectedCells(new Set([cellKey]));
      setDragStart({ rowId, colId });
      setIsDragging(true);
    }
  }, []);

  const handleCellMouseEnter = useCallback((rowId: string, colId: string) => {
    if (!isDragging || !dragStart || !table) return;
    
    // Calculate the rectangular selection area
    const startRowIndex = table.rows.findIndex(r => r.id === dragStart.rowId);
    const startColIndex = table.columns.findIndex(c => c.id === dragStart.colId);
    const endRowIndex = table.rows.findIndex(r => r.id === rowId);
    const endColIndex = table.columns.findIndex(c => c.id === colId);
    
    if (startRowIndex === -1 || startColIndex === -1 || endRowIndex === -1 || endColIndex === -1) return;
    
    const minRow = Math.min(startRowIndex, endRowIndex);
    const maxRow = Math.max(startRowIndex, endRowIndex);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);
    
    // Select all cells in the rectangle
    const newSelection = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const row = table.rows[r];
        const col = table.columns[c];
        if (row && col) {
          newSelection.add(`${row.id}-${col.id}`);
        }
      }
    }
    
    setSelectedCells(newSelection);
  }, [isDragging, dragStart, table]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Add global mouse up listener
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  const handleBulkColorChange = useCallback(async (color: string | null) => {
    if (!canEdit || selectedCells.size === 0) return;
    
    // Apply color to all selected cells sequentially to avoid version conflicts
    const cellKeys = Array.from(selectedCells);
    
    try {
      for (let i = 0; i < cellKeys.length; i++) {
        const cellKey = cellKeys[i];
        const [rowId, colId] = cellKey.split('-');
        // Silent update - don't show individual toasts
        await updateCellColor(rowId, colId, color, true);
      }
      
      setShowColorPicker(false);
      // Show single success toast after all updates
      toast.success(`Color ${color ? 'applied' : 'removed'} from ${selectedCells.size} cell(s)`);
      announceCellUpdate(`Color ${color ? 'applied' : 'removed'} from ${selectedCells.size} cell(s)`);
    } catch (error) {
      console.error('Error applying bulk color:', error);
      // Error already handled by updateCellColor
    }
  }, [selectedCells, updateCellColor, canEdit, announceCellUpdate]);

  const handleAddRow = async () => {
    // Check entitlement
    const canAdd = await canAddRow();
    if (!canAdd) {
      setShowUpgradePrompt(true);
      return;
    }

    try {
      await addRow();
    } catch (error: any) {
      if (error.response?.data?.code === 'ROW_LIMIT_REACHED') {
        setShowUpgradePrompt(true);
      }
    }
  };

  const handleAddColumn = async () => {
    // Check entitlement
    const canAdd = await canAddColumn(tableId);
    if (!canAdd) {
      setShowUpgradePrompt(true);
      return;
    }

    try {
      await addColumn();
    } catch (error: any) {
      if (error.message === 'COLUMN_LIMIT_REACHED') {
        setShowUpgradePrompt(true);
      }
    }
  };

  const handleDeleteColumn = async () => {
    if (!columnToDelete) return;

    try {
      await deleteColumn(columnToDelete.id);
    } catch (error) {
      // Error already handled by hook
    } finally {
      setColumnToDelete(null);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Are you sure you want to delete this row?')) return;

    try {
      await deleteRow(rowId);
    } catch (error) {
      // Error already handled by hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="text-center p-8 text-gray-500">
        Table not found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ARIA live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{table.name}</h2>
          {saving && (
            <span className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
              Saving...
            </span>
          )}
          {canEdit && selectedCells.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title={`Change color for ${selectedCells.size} selected cell(s)`}
              >
                <Palette className="h-4 w-4" />
                <span>Color ({selectedCells.size})</span>
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <ColorPicker
                    show={showColorPicker}
                    currentColor={undefined}
                    onColorSelect={handleBulkColorChange}
                    onClose={() => setShowColorPicker(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canFullAccess && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMemberManagement(true)}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Members
            </Button>
          )}
          <ExportButton tableId={tableId} tableName={table.name} />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-800">
        <table
          ref={tableRef}
          className="w-full"
          role="grid"
          aria-label={`${table.name} data table with ${table.rows.length} rows and ${table.columns.length} columns`}
          aria-rowcount={table.rows.length + 1}
          aria-colcount={table.columns.length + 1}
        >
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr role="row" aria-rowindex={1}>
              {table.columns.map((col: IColumn, colIndex: number) => (
                <th
                  key={col.id}
                  role="columnheader"
                  aria-colindex={colIndex + 1}
                  className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700 relative group"
                >
                  {canFullAccess && (
                    <button
                      onClick={() => {
                        setColumnToDelete({ id: col.id, number: colIndex + 1 });
                        setShowDeleteColumnModal(true);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      title="Delete column"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  )}
                </th>
              ))}
              {canFullAccess && (
                <>
                  <th
                    role="columnheader"
                    aria-colindex={table.columns.length + 1}
                    className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700"
                  >
                    {limits && limits.maxColumnsLimit !== -1 && table.columns.length >= limits.maxColumnsLimit ? (
                      <button
                        disabled
                        className="p-1 rounded opacity-50 cursor-not-allowed"
                        title={`Column limit reached (${table.columns.length}/${limits.maxColumnsLimit})`}
                      >
                        <Lock className="h-4 w-4 text-gray-400" />
                      </button>
                    ) : (
                      <button
                        onClick={handleAddColumn}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Add column"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </th>
                  <th
                    role="columnheader"
                    aria-colindex={table.columns.length + 2}
                    className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300 border-b"
                  >
                    Actions
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr role="row">
                <td
                  role="gridcell"
                  colSpan={table.columns.length + 1}
                  className="text-center py-8 text-gray-500"
                >
                  No rows yet. Click "Add Row" to get started.
                </td>
              </tr>
            ) : (
              table.rows.map((row: IRow, rowIndex: number) => {
                // Ensure row.data is a Map, convert if needed
                const dataMap = row.data instanceof Map ? row.data : new Map(Object.entries(row.data || {}));
                const colorsMap = row.colors instanceof Map ? row.colors : new Map(Object.entries(row.colors || {}));

                return (
                  <tr
                    key={row.id}
                    role="row"
                    aria-rowindex={rowIndex + 2}
                    className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
                  >
                    {table.columns.map((col: IColumn, colIndex: number) => {
                      const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === colIndex;
                      const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                      const cellKey = `${row.id}-${col.id}`;
                      const isSelected = selectedCells.has(cellKey);

                      return (
                        <td
                          key={col.id}
                          role="gridcell"
                          aria-colindex={colIndex + 1}
                          tabIndex={isFocused || (rowIndex === 0 && colIndex === 0) ? 0 : -1}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                          onFocus={() => setFocusedCell({ rowIndex, colIndex })}
                          onMouseDown={(e) => handleCellClick(row.id, col.id, e)}
                          onMouseEnter={() => handleCellMouseEnter(row.id, col.id)}
                          className={`border-b border-r border-gray-200 dark:border-gray-700 relative select-none ${
                            isFocused ? 'ring-2 ring-blue-500 ring-inset z-10' : ''
                          } ${
                            isSelected ? 'ring-2 ring-blue-400 ring-inset bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          style={{ 
                            position: 'relative',
                            overflow: 'visible'
                          }}
                          aria-label={`Cell ${rowIndex + 1}-${colIndex + 1}: ${dataMap.get(col.id) || 'empty'}`}
                        >
                          <CellEditor
                            value={dataMap.get(col.id)}
                            color={colorsMap.get(col.id) as string | undefined}
                            type={col.type}
                            isEditing={isEditing}
                            onValueChange={(value: any) => handleCellUpdate(row.id, col.id, value)}
                            onColorChange={(color: string | null) => handleColorUpdate(row.id, col.id, color)}
                            onEditStart={() => setEditingCell({ rowId: row.id, colId: col.id })}
                            onEditEnd={() => setEditingCell(null)}
                            readOnly={!canEdit}
                            showColorPicker={false}
                          />
                        </td>
                      );
                    })}
                    {canFullAccess && (
                      <>
                        <td
                          role="gridcell"
                          aria-colindex={table.columns.length + 1}
                          className="border-b border-r border-gray-200 dark:border-gray-700"
                        >
                          {/* Empty cell for Add Column button column */}
                        </td>
                        <td
                          role="gridcell"
                          aria-colindex={table.columns.length + 2}
                          className="border-b border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.id)}
                              aria-label={`Delete row ${rowIndex + 1}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Button - Only for FULL access */}
      {canFullAccess && (
        <div className="flex justify-center">
          <Button
            onClick={handleAddRow}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!!(limits && limits.maxRowsLimit !== -1 && (usage?.totalRows || 0) >= limits.maxRowsLimit)}
          >
            {limits && limits.maxRowsLimit !== -1 && (usage?.totalRows || 0) >= limits.maxRowsLimit ? (
              <>
                <Lock className="h-4 w-4" />
                <span>Row Limit Reached</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Add Row</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upgrade Prompt */}
      <UpgradePrompt
        show={showUpgradePrompt}
        feature="customTables"
        currentPlan="Free"
        requiredPlan="Pro"
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={() => {
          window.location.href = '/pricing';
        }}
      />

      {/* Delete Column Modal */}
      <DeleteColumnModal
        open={showDeleteColumnModal}
        onOpenChange={setShowDeleteColumnModal}
        columnNumber={columnToDelete?.number || 0}
        onConfirm={handleDeleteColumn}
      />

      {/* Table Member Management */}
      <TableMemberManagement
        open={showMemberManagement}
        onOpenChange={setShowMemberManagement}
        tableId={tableId}
        tableName={table.name}
        spaceId={spaceId}
        workspaceId={workspaceId}
      />
    </div>
  );
};
