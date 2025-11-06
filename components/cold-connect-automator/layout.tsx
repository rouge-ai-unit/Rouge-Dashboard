"use client";

import React, { useState, useEffect, useCallback, memo, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  AlertTriangle,
  Loader2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart3,
  Users,
  FileText,
  Send,
  Database
} from 'lucide-react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface LayoutProps {
  /** Child components to render in the main content area */
  children: React.ReactNode;
  /** Current active section/tab */
  activeSection?: string;
  /** Whether the sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Whether the layout is in loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Callback when section changes */
  onSectionChange?: (section: string) => void;
  /** Callback when sidebar toggle is clicked */
  onSidebarToggle?: (collapsed: boolean) => void;
  /** Custom CSS class name */
  className?: string;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Whether to show the footer */
  showFooter?: boolean;
  /** Page title */
  title?: string;
  /** Page subtitle/description */
  subtitle?: string;
}

export interface NavigationItem {
  /** Unique identifier for the section */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Badge/count to show */
  badge?: number | string;
  /** Tooltip text */
  tooltip?: string;
}

export interface LayoutState {
  /** Current sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Current active section */
  activeSection: string;
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    tooltip: 'Overview and analytics'
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users,
    tooltip: 'Manage contact lists'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: Send,
    tooltip: 'Email campaign management'
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: FileText,
    tooltip: 'Email templates'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    tooltip: 'Campaign performance'
  },
  {
    id: 'crm-sync',
    label: 'CRM Sync',
    icon: Database,
    tooltip: 'CRM integration status'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    tooltip: 'Configuration and preferences'
  }
];

const BREAKPOINT_MD = 768;
const SIDEBAR_WIDTH = 280;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// ============================================================================
// Error Boundary Component
// ============================================================================

interface LayoutErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LayoutErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  LayoutErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LayoutErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Cold Connect Automator Layout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-500/50">
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Layout Error</div>
                  <p className="text-sm mt-2">
                    Failed to load the Cold Connect Automator interface. Please refresh the page.
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
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Loading Component
// ============================================================================

const LayoutLoading: React.FC<{ message?: string }> = memo(({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
      <p className="text-gray-400">{message}</p>
    </div>
  </div>
));

LayoutLoading.displayName = 'LayoutLoading';

// ============================================================================
// Sidebar Component
// ============================================================================

interface SidebarProps {
  /** Navigation items */
  items: NavigationItem[];
  /** Currently active section */
  activeSection: string;
  /** Whether sidebar is collapsed */
  collapsed: boolean;
  /** Whether mobile menu is open */
  mobileOpen: boolean;
  /** Callback when section is clicked */
  onSectionChange: (section: string) => void;
  /** Callback when sidebar toggle is clicked */
  onToggle: () => void;
  /** Callback when mobile menu close is requested */
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({
  items,
  activeSection,
  collapsed,
  mobileOpen,
  onSectionChange,
  onToggle,
  onMobileClose
}) => {
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700
    transform transition-transform duration-300 ease-in-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:relative md:translate-x-0
    ${collapsed ? 'md:w-16' : 'md:w-64'}
  `;

  const overlayClasses = `
    fixed inset-0 z-40 bg-black bg-opacity-50
    ${mobileOpen ? 'block' : 'hidden'}
    md:hidden
  `;

  const handleItemClick = useCallback((item: NavigationItem) => {
    if (!item.disabled) {
      onSectionChange(item.id);
      onMobileClose();
    }
  }, [onSectionChange, onMobileClose]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={overlayClasses}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={sidebarClasses} role="navigation" aria-label="Main navigation">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            {!collapsed && (
              <div className="flex items-center">
                <Zap className="h-6 w-6 text-blue-400 mr-2" />
                <span className="text-lg font-semibold text-white">
                  Cold Connect
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-gray-400 hover:text-white"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="space-y-1">
              {items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`
                      w-full justify-start text-left
                      ${isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }
                      ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${collapsed ? 'px-2' : 'px-3'}
                    `}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    title={collapsed ? item.tooltip || item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <IconComponent className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            {!collapsed && (
              <div className="text-xs text-gray-500 text-center">
                Access help from the top navigation
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

// ============================================================================
// Header Component
// ============================================================================

interface HeaderProps {
  /** Page title */
  title?: string;
  /** Page subtitle */
  subtitle?: string;
  /** Whether sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
  /** Callback when mobile menu toggle is clicked */
  onMobileMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = memo(({
  title = "Cold Connect Automator",
  subtitle,
  sidebarCollapsed,
  mobileMenuOpen,
  onMobileMenuToggle
}) => (
  <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 md:px-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileMenuToggle}
          className="mr-4 text-gray-400 hover:text-white md:hidden"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
));

Header.displayName = 'Header';

// ============================================================================
// Main Layout Component
// ============================================================================

const ColdConnectAutomatorLayoutComponent: React.FC<LayoutProps> = memo(({
  children,
  activeSection = 'dashboard',
  sidebarCollapsed: initialSidebarCollapsed = false,
  isLoading = false,
  error,
  onSectionChange,
  onSidebarToggle,
  className,
  showHeader = true,
  showFooter = false,
  title,
  subtitle
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [layoutState, setLayoutState] = useState<LayoutState>({
    sidebarCollapsed: initialSidebarCollapsed,
    activeSection,
    mobileMenuOpen: false
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= BREAKPOINT_MD) {
        setLayoutState(prev => ({ ...prev, mobileMenuOpen: false }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync active section with prop changes
  useEffect(() => {
    setLayoutState(prev => ({ ...prev, activeSection }));
  }, [activeSection]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSectionChange = useCallback((section: string) => {
    setLayoutState(prev => ({ ...prev, activeSection: section }));
    onSectionChange?.(section);
  }, [onSectionChange]);

  const handleSidebarToggle = useCallback(() => {
    setLayoutState(prev => {
      const newCollapsed = !prev.sidebarCollapsed;
      onSidebarToggle?.(newCollapsed);
      return { ...prev, sidebarCollapsed: newCollapsed };
    });
  }, [onSidebarToggle]);

  const handleMobileMenuToggle = useCallback(() => {
    setLayoutState(prev => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }));
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setLayoutState(prev => ({ ...prev, mobileMenuOpen: false }));
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  const mainContentClasses = `
    flex-1 overflow-hidden
    ${layoutState.sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}
  `;

  return (
    <LayoutErrorBoundary>
      <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
        {/* Sidebar */}
        <Sidebar
          items={NAVIGATION_ITEMS}
          activeSection={layoutState.activeSection}
          collapsed={layoutState.sidebarCollapsed}
          mobileOpen={layoutState.mobileMenuOpen}
          onSectionChange={handleSectionChange}
          onToggle={handleSidebarToggle}
          onMobileClose={handleMobileMenuClose}
        />

        {/* Main content */}
        <div className={mainContentClasses}>
          {/* Header */}
          {showHeader && (
            <Header
              title={title}
              subtitle={subtitle}
              sidebarCollapsed={layoutState.sidebarCollapsed}
              mobileMenuOpen={layoutState.mobileMenuOpen}
              onMobileMenuToggle={handleMobileMenuToggle}
            />
          )}

          {/* Content */}
          <main className="flex-1 overflow-auto">
            {error && (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <Suspense fallback={<LayoutLoading />}>
              {isLoading ? (
                <LayoutLoading message="Loading Cold Connect Automator..." />
              ) : (
                <div className="p-4 md:p-6">
                  {children}
                </div>
              )}
            </Suspense>
          </main>

          {/* Footer */}
          {showFooter && (
            <>
              <Separator className="bg-gray-700" />
              <footer className="p-4 text-center text-sm text-gray-400">
                Cold Connect Automator v2.0 - Enterprise Edition
              </footer>
            </>
          )}
        </div>
      </div>
    </LayoutErrorBoundary>
  );
});

ColdConnectAutomatorLayoutComponent.displayName = 'ColdConnectAutomatorLayout';

// ============================================================================
// Exports
// ============================================================================

export default ColdConnectAutomatorLayoutComponent;
