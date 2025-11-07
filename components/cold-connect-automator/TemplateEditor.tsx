"use client";

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  Eye,
  EyeOff,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Target,
  Undo,
  Redo,
  AlertTriangle,
  Loader2,
  FileText,
  Settings,
  Zap,
  Code,
  Type,
  Palette,
  Search,
  Plus,
  Trash2
} from 'lucide-react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum TemplateEditorMode {
  EDIT = 'edit',
  PREVIEW = 'preview',
  SPLIT = 'split'
}

export enum TemplateValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface TemplateValidationError {
  /** Type of validation error */
  type: 'missing_placeholder' | 'invalid_syntax' | 'empty_field' | 'length_exceeded';
  /** Severity level */
  severity: TemplateValidationSeverity;
  /** Error message */
  message: string;
  /** Field that has the error */
  field: 'name' | 'subject' | 'content';
  /** Position in content (for syntax errors) */
  position?: number;
}

export interface TemplatePlaceholder {
  /** Placeholder key */
  key: string;
  /** Display label */
  label: string;
  /** Description */
  description: string;
  /** Example value */
  example: string;
  /** Whether it's required */
  required: boolean;
  /** Category */
  category: 'recipient' | 'sender' | 'company' | 'custom';
}

export interface TemplateEditorState {
  /** Current editor mode */
  mode: TemplateEditorMode;
  /** Template name */
  name: string;
  /** Email subject */
  subject: string;
  /** Email content */
  content: string;
  /** Undo/redo history */
  history: Array<{ name: string; subject: string; content: string; timestamp: Date }>;
  /** Current history index */
  historyIndex: number;
  /** Validation errors */
  validationErrors: TemplateValidationError[];
  /** Available placeholders */
  availablePlaceholders: TemplatePlaceholder[];
  /** Selected placeholder for insertion */
  selectedPlaceholder?: string;
}

export interface TemplateEditorProps {
  /** Template to edit (undefined for new template) */
  template?: any; // Using any to match existing Template type
  /** Callback when template is saved */
  onSave: (template: any) => Promise<void>;
  /** Callback when editing is cancelled */
  onCancel: () => void;
  /** User ID for template ownership */
  userId: string;
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Whether to show advanced features */
  showAdvanced?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PLACEHOLDERS: TemplatePlaceholder[] = [
  { key: 'recipient.name', label: 'Recipient Name', description: 'Full name of the recipient', example: 'John Doe', required: true, category: 'recipient' },
  { key: 'recipient.email', label: 'Recipient Email', description: 'Email address of the recipient', example: 'john@company.com', required: true, category: 'recipient' },
  { key: 'recipient.company', label: 'Company Name', description: 'Company the recipient works for', example: 'Acme Corp', required: false, category: 'recipient' },
  { key: 'recipient.role', label: 'Job Title', description: 'Recipient\'s job title', example: 'CTO', required: false, category: 'recipient' },
  { key: 'recipient.industry', label: 'Industry', description: 'Industry the company operates in', example: 'Technology', required: false, category: 'recipient' },
  { key: 'sender.name', label: 'Your Name', description: 'Your full name', example: 'Jane Smith', required: true, category: 'sender' },
  { key: 'sender.email', label: 'Your Email', description: 'Your email address', example: 'jane@yourcompany.com', required: true, category: 'sender' },
  { key: 'sender.company', label: 'Your Company', description: 'Your company name', example: 'Your Company Inc', required: false, category: 'sender' },
  { key: 'sender.role', label: 'Your Title', description: 'Your job title', example: 'Sales Director', required: false, category: 'sender' },
  { key: 'company.founded', label: 'Company Founded', description: 'When the company was founded', example: '2015', required: false, category: 'company' },
  { key: 'company.size', label: 'Company Size', description: 'Number of employees', example: '50-100', required: false, category: 'company' }
];

const MAX_HISTORY_SIZE = 50;
const VALIDATION_RULES = {
  name: { minLength: 1, maxLength: 100 },
  subject: { minLength: 1, maxLength: 200 },
  content: { minLength: 10, maxLength: 10000 }
};

// ============================================================================
// Error Boundary Component
// ============================================================================

interface TemplateEditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class TemplateEditorErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  TemplateEditorErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TemplateEditorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Template Editor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full border-red-500/50">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Template Editor Error</div>
                <p className="text-sm mt-2">
                  Failed to load the template editor. Please refresh the page.
                </p>
                {this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Error details</summary>
                    <pre className="mt-1 text-xs overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

const validateTemplate = (
  name: string,
  subject: string,
  content: string,
  placeholders: TemplatePlaceholder[]
): TemplateValidationError[] => {
  const errors: TemplateValidationError[] = [];

  // Name validation
  if (!name.trim()) {
    errors.push({
      type: 'empty_field',
      severity: TemplateValidationSeverity.ERROR,
      message: 'Template name is required',
      field: 'name'
    });
  } else if (name.length > VALIDATION_RULES.name.maxLength) {
    errors.push({
      type: 'length_exceeded',
      severity: TemplateValidationSeverity.ERROR,
      message: `Template name must be ${VALIDATION_RULES.name.maxLength} characters or less`,
      field: 'name'
    });
  }

  // Subject validation
  if (!subject.trim()) {
    errors.push({
      type: 'empty_field',
      severity: TemplateValidationSeverity.ERROR,
      message: 'Email subject is required',
      field: 'subject'
    });
  } else if (subject.length > VALIDATION_RULES.subject.maxLength) {
    errors.push({
      type: 'length_exceeded',
      severity: TemplateValidationSeverity.WARNING,
      message: `Subject line is long (${subject.length} chars). Consider shortening for better open rates`,
      field: 'subject'
    });
  }

  // Content validation
  if (!content.trim()) {
    errors.push({
      type: 'empty_field',
      severity: TemplateValidationSeverity.ERROR,
      message: 'Email content is required',
      field: 'content'
    });
  } else if (content.length < VALIDATION_RULES.content.minLength) {
    errors.push({
      type: 'length_exceeded',
      severity: TemplateValidationSeverity.WARNING,
      message: `Email content is very short. Consider adding more detail`,
      field: 'content'
    });
  } else if (content.length > VALIDATION_RULES.content.maxLength) {
    errors.push({
      type: 'length_exceeded',
      severity: TemplateValidationSeverity.ERROR,
      message: `Email content exceeds maximum length of ${VALIDATION_RULES.content.maxLength} characters`,
      field: 'content'
    });
  }

  // Check for required placeholders
  const requiredPlaceholders = placeholders.filter(p => p.required);
  const contentPlaceholders: string[] = content.match(/{{([^}]+)}}/g) || [];

  for (const required of requiredPlaceholders) {
    if (!contentPlaceholders.includes(`{{${required.key}}}`)) {
      errors.push({
        type: 'missing_placeholder',
        severity: TemplateValidationSeverity.WARNING,
        message: `Consider using ${required.label} placeholder for personalization`,
        field: 'content'
      });
    }
  }

  // Check for invalid placeholder syntax
  const invalidPlaceholders = content.match(/{{[^}]*$/g);
  if (invalidPlaceholders) {
    errors.push({
      type: 'invalid_syntax',
      severity: TemplateValidationSeverity.ERROR,
      message: 'Invalid placeholder syntax detected. Placeholders must be in format {{key}}',
      field: 'content'
    });
  }

  return errors;
};

const renderTemplatePreview = (
  content: string,
  placeholders: TemplatePlaceholder[]
): string => {
  let preview = content;

  // Replace all placeholders with example values
  placeholders.forEach(placeholder => {
    const regex = new RegExp(`{{${placeholder.key}}}`, 'g');
    preview = preview.replace(regex, placeholder.example);
  });

  // Replace any remaining placeholders with placeholder text
  preview = preview.replace(/{{([^}]+)}}/g, '[$1]');

  return preview;
};

const extractPlaceholdersFromContent = (content: string): string[] => {
  const matches = content.match(/{{[^}]+}}/g) || [];
  return [...new Set(matches)];
};

// ============================================================================
// Main Component
// ============================================================================

const TemplateEditorComponent: React.FC<TemplateEditorProps> = memo(({
  template,
  onSave,
  onCancel,
  userId,
  isLoading = false,
  error,
  showAdvanced = false,
  className
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [editorState, setEditorState] = useState<TemplateEditorState>({
    mode: TemplateEditorMode.EDIT,
    name: template?.name || '',
    subject: template?.subject || '',
    content: template?.content || '',
    history: [],
    historyIndex: -1,
    validationErrors: [],
    availablePlaceholders: DEFAULT_PLACEHOLDERS,
    selectedPlaceholder: undefined
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const validationErrors = useMemo(() =>
    validateTemplate(
      editorState.name,
      editorState.subject,
      editorState.content,
      editorState.availablePlaceholders
    ),
    [editorState.name, editorState.subject, editorState.content, editorState.availablePlaceholders]
  );

  const usedPlaceholders = useMemo(() =>
    extractPlaceholdersFromContent(editorState.content),
    [editorState.content]
  );

  const filteredPlaceholders = useMemo(() => {
    if (!searchTerm) return editorState.availablePlaceholders;

    return editorState.availablePlaceholders.filter(placeholder =>
      placeholder.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placeholder.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      placeholder.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [editorState.availablePlaceholders, searchTerm]);

  const previewContent = useMemo(() =>
    renderTemplatePreview(editorState.content, editorState.availablePlaceholders),
    [editorState.content, editorState.availablePlaceholders]
  );

  const canUndo = useMemo(() =>
    editorState.historyIndex > 0, [editorState.historyIndex]
  );

  const canRedo = useMemo(() =>
    editorState.historyIndex < editorState.history.length - 1, [editorState.historyIndex, editorState.history.length]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!template) return !!(editorState.name || editorState.subject || editorState.content);
    return (
      editorState.name !== (template.name || '') ||
      editorState.subject !== (template.subject || '') ||
      editorState.content !== (template.content || '')
    );
  }, [template, editorState.name, editorState.subject, editorState.content]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize from template
  useEffect(() => {
    if (template) {
      setEditorState(prev => ({
        ...prev,
        name: template.name || '',
        subject: template.subject || '',
        content: template.content || '',
        history: [{
          name: template.name || '',
          subject: template.subject || '',
          content: template.content || '',
          timestamp: new Date()
        }],
        historyIndex: 0
      }));
    }
  }, [template]);

  // Update validation errors
  useEffect(() => {
    setEditorState(prev => ({ ...prev, validationErrors }));
  }, [validationErrors]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const saveToHistory = useCallback(() => {
    setEditorState(prev => {
      const newEntry = {
        name: prev.name,
        subject: prev.subject,
        content: prev.content,
        timestamp: new Date()
      };

      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), newEntry];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, []);

  const updateField = useCallback((field: keyof Pick<TemplateEditorState, 'name' | 'subject' | 'content'>, value: string) => {
    setEditorState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleUndo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex <= 0) return prev;

      const targetState = prev.history[prev.historyIndex - 1];
      return {
        ...prev,
        name: targetState.name,
        subject: targetState.subject,
        content: targetState.content,
        historyIndex: prev.historyIndex - 1
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;

      const targetState = prev.history[prev.historyIndex + 1];
      return {
        ...prev,
        name: targetState.name,
        subject: targetState.subject,
        content: targetState.content,
        historyIndex: prev.historyIndex + 1
      };
    });
  }, []);

  const insertPlaceholder = useCallback((placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = editorState.content.substring(0, start);
    const after = editorState.content.substring(end);

    const newContent = `${before}{{${placeholder}}}${after}`;
    updateField('content', newContent);

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + placeholder.length + 4; // 4 for {{}}
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [editorState.content, updateField]);

  const handleSave = useCallback(async () => {
    if (validationErrors.some(e => e.severity === TemplateValidationSeverity.ERROR)) {
      return;
    }

    setIsSaving(true);
    try {
      const templateData = template
        ? { name: editorState.name, subject: editorState.subject, content: editorState.content }
        : { name: editorState.name, subject: editorState.subject, content: editorState.content, userId };

      await onSave(templateData);
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  }, [template, editorState, userId, onSave, validationErrors]);

  const handleReset = useCallback(() => {
    if (template) {
      setEditorState(prev => ({
        ...prev,
        name: template.name || '',
        subject: template.subject || '',
        content: template.content || ''
      }));
    } else {
      setEditorState(prev => ({
        ...prev,
        name: '',
        subject: '',
        content: ''
      }));
    }
  }, [template]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editorState.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [editorState.content]);

  const optimizeSubjectWithAI = useCallback(async () => {
    setIsAIGenerating(true);
    try {
      const response = await fetch('/api/cold-outreach/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'optimize_subject',
          subject: editorState.subject,
          content: editorState.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize subject');
      }

      const data = await response.json();
      updateField('subject', data.optimizedSubject || editorState.subject);
      saveToHistory();
    } catch (error) {
      console.error('Error optimizing subject:', error);
      // Fallback to basic optimization
      const optimizedSubject = editorState.subject.trim() || 'Exclusive Opportunity';
      updateField('subject', optimizedSubject);
    } finally {
      setIsAIGenerating(false);
    }
  }, [editorState.subject, editorState.content, updateField, saveToHistory]);

  const personalizeContentWithAI = useCallback(async () => {
    setIsAIGenerating(true);
    try {
      const response = await fetch('/api/cold-outreach/ai-personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: editorState.content,
          subject: editorState.subject,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to personalize content');
      }

      const data = await response.json();
      updateField('content', data.personalizedContent || editorState.content);
      saveToHistory();
    } catch (error) {
      console.error('Error personalizing content:', error);
      // Fallback to adding signature placeholders
      const personalizedContent = `${editorState.content}\n\nBest regards,\n{{sender.name}}\n{{sender.role}}\n{{sender.company}}`;
      updateField('content', personalizedContent);
    } finally {
      setIsAIGenerating(false);
    }
  }, [editorState.content, editorState.subject, updateField, saveToHistory]);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              handleRedo();
            } else {
              e.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSave]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderValidationErrors = useCallback(() => {
    if (validationErrors.length === 0) return null;

    const errors = validationErrors.filter(e => e.severity === TemplateValidationSeverity.ERROR);
    const warnings = validationErrors.filter(e => e.severity === TemplateValidationSeverity.WARNING);

    return (
      <div className="space-y-2">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Please fix the following errors:</div>
              <ul className="mt-2 list-disc list-inside text-sm">
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Suggestions:</div>
              <ul className="mt-2 list-disc list-inside text-sm">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }, [validationErrors]);

  const renderToolbar = useCallback(() => (
    <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800/50">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          title="Copy to clipboard"
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          title="Reset changes"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditorState(prev => ({ ...prev, mode: TemplateEditorMode.EDIT }))}
          className={editorState.mode === TemplateEditorMode.EDIT ? 'bg-blue-600' : ''}
        >
          <Type className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditorState(prev => ({ ...prev, mode: TemplateEditorMode.PREVIEW }))}
          className={editorState.mode === TemplateEditorMode.PREVIEW ? 'bg-blue-600' : ''}
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        {showAdvanced && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditorState(prev => ({ ...prev, mode: TemplateEditorMode.SPLIT }))}
            className={editorState.mode === TemplateEditorMode.SPLIT ? 'bg-blue-600' : ''}
          >
            <Code className="h-4 w-4 mr-1" />
            Split
          </Button>
        )}
      </div>
    </div>
  ), [canUndo, canRedo, isCopied, editorState.mode, showAdvanced, handleUndo, handleRedo, copyToClipboard, handleReset]);

  const renderPlaceholdersPanel = useCallback(() => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Placeholders</CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search placeholders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-2">
            {filteredPlaceholders.map((placeholder) => (
              <div
                key={placeholder.key}
                className="p-3 rounded-lg border border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => insertPlaceholder(placeholder.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    insertPlaceholder(placeholder.key);
                  }
                }}
                aria-label={`Insert ${placeholder.label} placeholder`}
              >
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-blue-400">
                    {`{{${placeholder.key}}}`}
                  </code>
                  {placeholder.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-300 mt-1">{placeholder.label}</div>
                <div className="text-xs text-gray-500 mt-1">{placeholder.description}</div>
                <div className="text-xs text-gray-400 mt-1">Example: {placeholder.example}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  ), [searchTerm, filteredPlaceholders, insertPlaceholder]);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Loading template editor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TemplateEditorErrorBoundary>
      <Card className={`w-full ${className}`} role="region" aria-labelledby="template-editor-title">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle id="template-editor-title">
                {template ? 'Edit Template' : 'Create New Template'}
              </CardTitle>
              <CardDescription>
                {template
                  ? 'Modify your email template with advanced editing features'
                  : 'Create a new email template with AI-powered assistance'}
              </CardDescription>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>

        <div className="border-b border-gray-700">
          {renderToolbar()}
        </div>

        <CardContent className="p-0">
          {error && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {renderValidationErrors()}

          <div className="p-4 space-y-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={editorState.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Startup Partnership Outreach"
                aria-describedby="template-name-error"
              />
            </div>

            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="template-subject">Email Subject</Label>
              <div className="flex gap-2">
                <Input
                  ref={subjectInputRef}
                  id="template-subject"
                  value={editorState.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="e.g., Partnership Opportunity for {{recipient.company}}"
                  className="flex-1"
                  aria-describedby="template-subject-error"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={optimizeSubjectWithAI}
                  disabled={isAIGenerating}
                  title="Optimize subject with AI"
                >
                  {isAIGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="template-content">Email Content</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={personalizeContentWithAI}
                    disabled={isAIGenerating}
                    title="Personalize content with AI"
                  >
                    {isAIGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-1" />
                    )}
                    Personalize
                  </Button>
                </div>
              </div>

              {editorState.mode === TemplateEditorMode.EDIT && (
                <Textarea
                  ref={textareaRef}
                  id="template-content"
                  value={editorState.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  placeholder="Enter your email template content. Use placeholders like {{recipient.name}}, {{sender.company}}, etc."
                  className="min-h-[300px] font-mono text-sm"
                  aria-describedby="template-content-error"
                />
              )}

              {editorState.mode === TemplateEditorMode.PREVIEW && (
                <div className="border rounded-md p-4 bg-gray-900 min-h-[300px] whitespace-pre-wrap font-mono text-sm">
                  {previewContent}
                </div>
              )}

              {editorState.mode === TemplateEditorMode.SPLIT && (
                <div className="grid grid-cols-2 gap-4 min-h-[300px]">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Editor</Label>
                    <Textarea
                      ref={textareaRef}
                      value={editorState.content}
                      onChange={(e) => updateField('content', e.target.value)}
                      className="min-h-[250px] font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Preview</Label>
                    <div className="border rounded-md p-3 bg-gray-900 min-h-[250px] whitespace-pre-wrap font-mono text-sm">
                      {previewContent}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Used Placeholders */}
            {usedPlaceholders.length > 0 && (
              <div className="space-y-2">
                <Label>Used Placeholders</Label>
                <div className="flex flex-wrap gap-2">
                  {usedPlaceholders.map((placeholder, index) => (
                    <Badge key={index} variant="secondary" className="font-mono">
                      {placeholder}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Placeholders Panel */}
            {showAdvanced && (
              <div className="border-t border-gray-700 pt-4">
                <Tabs defaultValue="placeholders" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="placeholders" className="mt-4">
                    {renderPlaceholdersPanel()}
                  </TabsContent>
                  <TabsContent value="settings" className="mt-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Advanced Features</Label>
                            <Badge variant="secondary">Coming Soon</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || validationErrors.some(e => e.severity === TemplateValidationSeverity.ERROR)}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TemplateEditorErrorBoundary>
  );
});

TemplateEditorComponent.displayName = 'TemplateEditor';

// ============================================================================
// Exports
// ============================================================================

export const TemplateEditor = TemplateEditorComponent;
