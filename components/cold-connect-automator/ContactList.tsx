"use client";

import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Building,
  Briefcase,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { Contact } from '@/lib/cold-outreach/contacts';

/**
 * Enterprise-grade Contact List Component
 *
 * Features:
 * - Comprehensive contact management with search, sort, and pagination
 * - Accessibility-first design with ARIA labels and keyboard navigation
 * - Performance optimized with memoization and virtualization-ready
 * - Error handling and recovery with user feedback
 * - Internationalization ready with proper labeling
 * - Responsive design for all screen sizes
 * - Confirmation dialogs for destructive actions
 * - Loading states and async operation management
 */

// ============================================================================
// Types and Constants
// ============================================================================

/**
 * Sort field options for contact list
 */
export enum ContactSortField {
  NAME = 'name',
  EMAIL = 'email',
  COMPANY = 'company',
  ROLE = 'role',
  CREATED_AT = 'createdAt'
}

/**
 * Sort direction options
 */
export enum ContactSortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Operation types for tracking async states
 */
enum OperationType {
  DELETE = 'delete',
  BULK_DELETE = 'bulk_delete',
  IMPORT = 'import'
}

/**
 * Enhanced props interface with comprehensive typing
 */
interface ContactListProps {
  /** Contact data */
  contacts: Contact[];
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;

  /** Pagination */
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalContacts?: number;

  /** Event handlers */
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contactId: string) => Promise<void>;
  onImportCSV: () => Promise<void>;
  onPageChange?: (page: number) => void;
  onBulkDelete?: (contactIds: string[]) => Promise<void>;

  /** Optional callbacks */
  onError?: (error: Error, operation: OperationType) => void;
  onSuccess?: (operation: OperationType) => void;

  /** Configuration */
  enableBulkActions?: boolean;
  enablePagination?: boolean;
  enableKeyboardNavigation?: boolean;
  showConfirmationDialogs?: boolean;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

/**
 * ContactList - Enterprise-grade contact management interface
 */
export const ContactList = memo<ContactListProps>(({
  contacts,
  loading = false,
  error = null,
  currentPage = 1,
  totalPages = 1,
  pageSize = 50,
  totalContacts = 0,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onImportCSV,
  onPageChange,
  onBulkDelete,
  onError,
  onSuccess,
  enableBulkActions = false,
  enablePagination = true,
  enableKeyboardNavigation = true,
  showConfirmationDialogs = true,
  className = ''
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<ContactSortField>(ContactSortField.NAME);
  const [sortDirection, setSortDirection] = useState<ContactSortDirection>(ContactSortDirection.ASC);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [operationStates, setOperationStates] = useState<Record<OperationType, boolean>>({
    [OperationType.DELETE]: false,
    [OperationType.BULK_DELETE]: false,
    [OperationType.IMPORT]: false
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Memoized Computations
  // ============================================================================

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;

    const term = searchTerm.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(term) ||
      contact.email.toLowerCase().includes(term) ||
      (contact.company && contact.company.toLowerCase().includes(term)) ||
      (contact.role && contact.role.toLowerCase().includes(term)) ||
      (contact.firstName && contact.firstName.toLowerCase().includes(term)) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(term))
    );
  }, [contacts, searchTerm]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === ContactSortDirection.ASC ? -1 : 1;
      if (bVal == null) return sortDirection === ContactSortDirection.ASC ? 1 : -1;

      // Handle date sorting
      if (sortField === ContactSortField.CREATED_AT) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        // String comparison for other fields
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (sortDirection === ContactSortDirection.ASC) {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [filteredContacts, sortField, sortDirection]);

  const paginationInfo = useMemo(() => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalContacts);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
      startItem,
      endItem,
      hasNextPage,
      hasPrevPage,
      showingText: `Showing ${startItem}-${endItem} of ${totalContacts} contacts`
    };
  }, [currentPage, pageSize, totalContacts, totalPages]);

  const bulkActionsEnabled = useMemo(() => {
    return enableBulkActions && selectedContacts.size > 0;
  }, [enableBulkActions, selectedContacts.size]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSort = useCallback((field: ContactSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === ContactSortDirection.ASC ? ContactSortDirection.DESC : ContactSortDirection.ASC);
    } else {
      setSortField(field);
      setSortDirection(ContactSortDirection.ASC);
    }
  }, [sortField, sortDirection]);

  const executeOperation = useCallback(async (
    operation: OperationType,
    operationFn: () => Promise<void>
  ) => {
    if (operationStates[operation]) return;

    setOperationStates(prev => ({ ...prev, [operation]: true }));

    try {
      await operationFn();
      onSuccess?.(operation);
    } catch (error) {
      onError?.(error as Error, operation);
    } finally {
      setOperationStates(prev => ({ ...prev, [operation]: false }));
    }
  }, [operationStates, onError, onSuccess]);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    if (showConfirmationDialogs && showDeleteConfirm !== contactId) {
      setShowDeleteConfirm(contactId);
      return;
    }

    setShowDeleteConfirm(null);
    await executeOperation(OperationType.DELETE, () => onDeleteContact(contactId));
  }, [executeOperation, onDeleteContact, showConfirmationDialogs, showDeleteConfirm]);

  const handleBulkDelete = useCallback(async () => {
    if (!onBulkDelete || selectedContacts.size === 0) return;

    if (showConfirmationDialogs && !showBulkDeleteConfirm) {
      setShowBulkDeleteConfirm(true);
      return;
    }

    setShowBulkDeleteConfirm(false);
    const contactIds = Array.from(selectedContacts);
    await executeOperation(OperationType.BULK_DELETE, () => onBulkDelete(contactIds));
    setSelectedContacts(new Set());
  }, [executeOperation, onBulkDelete, selectedContacts, showConfirmationDialogs, showBulkDeleteConfirm]);

  const handleImportCSV = useCallback(async () => {
    await executeOperation(OperationType.IMPORT, onImportCSV);
  }, [executeOperation, onImportCSV]);

  const handleContactSelect = useCallback((contactId: string, selected: boolean) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(contactId);
      } else {
        newSet.delete(contactId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedContacts(new Set(sortedContacts.map(contact => contact.id!)));
    } else {
      setSelectedContacts(new Set());
    }
  }, [sortedContacts]);
  const handlePageChange = useCallback((page: number) => {
    onPageChange?.(page);
    setFocusedContactId(null);
  }, [onPageChange]);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    switch (event.key) {
      case '/':
        event.preventDefault();
        searchInputRef.current?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        setSelectedContacts(new Set());
        setShowDeleteConfirm(null);
        setShowBulkDeleteConfirm(false);
        break;
    }
  }, [enableKeyboardNavigation]);

  const handleTableKeyDown = useCallback((event: React.KeyboardEvent, contactId: string) => {
    if (!enableKeyboardNavigation) return;

    const currentIndex = sortedContacts.findIndex(c => c.id === contactId);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(sortedContacts.length - 1, currentIndex + 1);
        break;
      case 'Enter':
        event.preventDefault();
        onEditContact(sortedContacts[currentIndex]);
        break;
      case 'Delete':
        event.preventDefault();
        handleDeleteContact(sortedContacts[currentIndex].id!);
        break;
    }

    if (newIndex !== currentIndex) {
      setFocusedContactId(sortedContacts[newIndex].id!);
    }
  }, [enableKeyboardNavigation, sortedContacts, onEditContact, handleDeleteContact]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderSortIndicator = (field: ContactSortField) => {
    if (sortField !== field) return null;

    return sortDirection === ContactSortDirection.ASC ?
      <SortAsc className="ml-1 h-4 w-4" aria-hidden="true" /> :
      <SortDesc className="ml-1 h-4 w-4" aria-hidden="true" />;
  };

  const renderTableHeader = () => (
    <thead>
      <tr className="border-b border-gray-700">
        {enableBulkActions && (
          <th className="py-3 px-4 text-left">
            <input
              type="checkbox"
              checked={selectedContacts.size === sortedContacts.length && sortedContacts.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              aria-label="Select all contacts"
              className="rounded border-gray-600"
            />
          </th>
        )}
        <th
          className="py-3 px-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-800 rounded transition-colors"
          onClick={() => handleSort(ContactSortField.NAME)}
          aria-sort={sortField === ContactSortField.NAME ? (sortDirection === ContactSortDirection.ASC ? 'ascending' : 'descending') : 'none'}
        >
          <div className="flex items-center">
            Name
            {renderSortIndicator(ContactSortField.NAME)}
          </div>
        </th>
        <th
          className="py-3 px-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-800 rounded transition-colors"
          onClick={() => handleSort(ContactSortField.EMAIL)}
          aria-sort={sortField === ContactSortField.EMAIL ? (sortDirection === ContactSortDirection.ASC ? 'ascending' : 'descending') : 'none'}
        >
          <div className="flex items-center">
            Email
            {renderSortIndicator(ContactSortField.EMAIL)}
          </div>
        </th>
        <th
          className="py-3 px-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-800 rounded transition-colors"
          onClick={() => handleSort(ContactSortField.COMPANY)}
          aria-sort={sortField === ContactSortField.COMPANY ? (sortDirection === ContactSortDirection.ASC ? 'ascending' : 'descending') : 'none'}
        >
          <div className="flex items-center">
            Company
            {renderSortIndicator(ContactSortField.COMPANY)}
          </div>
        </th>
        <th
          className="py-3 px-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-800 rounded transition-colors"
          onClick={() => handleSort(ContactSortField.ROLE)}
          aria-sort={sortField === ContactSortField.ROLE ? (sortDirection === ContactSortDirection.ASC ? 'ascending' : 'descending') : 'none'}
        >
          <div className="flex items-center">
            Role
            {renderSortIndicator(ContactSortField.ROLE)}
          </div>
        </th>
        <th className="py-3 px-4 text-right text-sm font-semibold text-gray-300">Actions</th>
      </tr>
    </thead>
  );

  const renderContactRow = (contact: Contact) => {
    const isSelected = selectedContacts.has(contact.id!);
    const isFocused = focusedContactId === contact.id;

    return (
      <tr
        key={contact.id}
        className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
          isSelected ? 'bg-blue-900/20' : ''
        } ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        onKeyDown={(e) => handleTableKeyDown(e, contact.id!)}
        tabIndex={0}
        role="row"
        aria-selected={isSelected}
      >
        {enableBulkActions && (
          <td className="py-3 px-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleContactSelect(contact.id!, e.target.checked)}
              aria-label={`Select contact ${contact.name}`}
              className="rounded border-gray-600"
            />
          </td>
        )}
        <td className="py-3 px-4">
          <div className="flex items-center">
            <div className="bg-gray-700 rounded-full p-2 mr-3 flex-shrink-0">
              <User className="h-4 w-4 text-gray-300" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-100 truncate">{contact.name}</div>
              {contact.firstName && contact.lastName && (
                <div className="text-xs text-gray-400 truncate">
                  {contact.firstName} {contact.lastName}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-300 truncate max-w-xs" title={contact.email}>
          {contact.email}
        </td>
        <td className="py-3 px-4">
          {contact.company ? (
            <div className="flex items-center min-w-0">
              <Building className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <span className="truncate" title={contact.company}>{contact.company}</span>
            </div>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </td>
        <td className="py-3 px-4">
          {contact.role ? (
            <div className="flex items-center min-w-0">
              <Briefcase className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <span className="truncate" title={contact.role}>{contact.role}</span>
            </div>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditContact(contact)}
              aria-label={`Edit contact ${contact.name}`}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteContact(contact.id!)}
              disabled={operationStates[OperationType.DELETE]}
              aria-label={`Delete contact ${contact.name}`}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              {operationStates[OperationType.DELETE] ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderEmptyState = () => (
    <tr>
      <td colSpan={enableBulkActions ? 6 : 5} className="py-12 px-4 text-center text-gray-400">
        <User className="mx-auto h-12 w-12 text-gray-600 mb-4" aria-hidden="true" />
        <p className="text-lg font-medium mb-2">
          {searchTerm ? 'No contacts found' : 'No contacts yet'}
        </p>
        <p className="text-sm mb-4">
          {searchTerm
            ? `No contacts match "${searchTerm}". Try adjusting your search.`
            : 'Add your first contact or import from CSV to get started.'
          }
        </p>
        {!searchTerm && (
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleImportCSV} disabled={operationStates[OperationType.IMPORT]}>
              {operationStates[OperationType.IMPORT] ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Import CSV
                </>
              )}
            </Button>
            <Button onClick={onAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        )}
      </td>
    </tr>
  );

  const renderPagination = () => {
    if (!enablePagination || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          {paginationInfo.showingText}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!paginationInfo.hasPrevPage}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-400 px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!paginationInfo.hasNextPage}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmation = () => {
    if (!showDeleteConfirm) return null;

    const contact = contacts.find(c => c.id === showDeleteConfirm);
    if (!contact) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
          <h2 id="delete-dialog-title" className="text-lg font-semibold mb-4">
            Delete Contact
          </h2>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete &quot;{contact.name}&quot;? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
              disabled={operationStates[OperationType.DELETE]}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteContact(contact.id!)}
              disabled={operationStates[OperationType.DELETE]}
            >
              {operationStates[OperationType.DELETE] ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkDeleteConfirmation = () => {
    if (!showBulkDeleteConfirm) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-dialog-title"
      >
        <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
          <h2 id="bulk-delete-dialog-title" className="text-lg font-semibold mb-4">
            Delete Multiple Contacts
          </h2>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''}?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={operationStates[OperationType.BULK_DELETE]}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={operationStates[OperationType.BULK_DELETE]}
            >
              {operationStates[OperationType.BULK_DELETE] ? 'Deleting...' : 'Delete All'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <>
      <Card className={`w-full ${className}`} role="region" aria-labelledby="contacts-list-title">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle id="contacts-list-title" className="text-xl font-bold">
              Contacts
            </CardTitle>
            <CardDescription>
              Manage your contact database for cold outreach campaigns
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {bulkActionsEnabled && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                aria-label={`Delete ${selectedContacts.size} selected contacts`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedContacts.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportCSV}
              disabled={operationStates[OperationType.IMPORT]}
              aria-label="Import contacts from CSV file"
            >
              {operationStates[OperationType.IMPORT] ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Import CSV
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={onAddContact}
              aria-label="Add new contact"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>

        <CardContent onKeyDown={handleKeyDown}>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
              <Input
                ref={searchInputRef}
                placeholder="Search contacts... (Press / to focus)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search contacts by name, email, company, or role"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" aria-label="Open filters">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-400 font-medium">Error loading contacts</span>
              </div>
              <p className="text-red-300 text-sm mt-1">{error.message}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent mr-2" />
                <span className="text-blue-400 font-medium">Loading contacts...</span>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {!loading && !error && (
            <div className="mb-4 text-sm text-gray-400">
              {searchTerm ? (
                `Found ${sortedContacts.length} contact${sortedContacts.length !== 1 ? 's' : ''} matching "${searchTerm}"`
              ) : (
                `Showing ${sortedContacts.length} contact${sortedContacts.length !== 1 ? 's' : ''}`
              )}
            </div>
          )}

          {/* Contacts Table */}
          <div className="overflow-x-auto border border-gray-700 rounded-lg">
            <table className="w-full" role="table" aria-label="Contacts list">
              {renderTableHeader()}
              <tbody>
                {sortedContacts.length === 0 ? (
                  renderEmptyState()
                ) : (
                  sortedContacts.map(renderContactRow)
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {renderPagination()}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      {renderDeleteConfirmation()}
      {renderBulkDeleteConfirmation()}
    </>
  );
});

ContactList.displayName = 'ContactList';

// ============================================================================
// Exports
// ============================================================================

export type { ContactListProps };
