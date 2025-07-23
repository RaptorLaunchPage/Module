// Global Theme Configuration for Raptor Esports CRM
// Ensures consistent theming across all components

export const GLOBAL_THEME = {
  // Glassmorphic Base Styles
  glassmorphic: {
    // Primary containers (cards, modals, panels)
    primary: "bg-black/70 backdrop-blur-lg border border-white/30 shadow-2xl",
    
    // Secondary containers (sidebar, headers)
    secondary: "bg-black/60 backdrop-blur-md border border-white/25 shadow-xl",
    
    // Subtle containers (dropdowns, tooltips)
    subtle: "bg-black/50 backdrop-blur-sm border border-white/20 shadow-lg",
    
    // Interactive elements (buttons, inputs on glassmorphic backgrounds)
    interactive: "bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200",
    
    // Loading/overlay states
    overlay: "bg-black/80 backdrop-blur-md"
  },

  // Background Gradients
  backgrounds: {
    // Main app background
    primary: "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900",
    
    // Video background overlay
    videoOverlay: "bg-gradient-to-br from-slate-900/50 via-blue-900/30 to-slate-900/50",
    
    // Loading screens
    loading: "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900",
    
    // Error/warning states
    error: "bg-gradient-to-br from-red-900/20 via-slate-900 to-red-900/20",
    success: "bg-gradient-to-br from-green-900/20 via-slate-900 to-green-900/20"
  },

  // Text Colors
  text: {
    primary: "text-white",
    secondary: "text-white/80",
    muted: "text-white/60",
    accent: "text-blue-300",
    success: "text-green-300",
    warning: "text-yellow-300",
    error: "text-red-300"
  },

  // Border Colors
  borders: {
    primary: "border-white/30",
    secondary: "border-white/20",
    subtle: "border-white/10",
    accent: "border-blue-400/50",
    success: "border-green-400/50",
    warning: "border-yellow-400/50",
    error: "border-red-400/50"
  },

  // Z-Index Layers
  zIndex: {
    background: "z-0",
    content: "z-10",
    overlay: "z-20",
    modal: "z-30",
    tooltip: "z-40",
    toast: "z-50"
  },

  // Transitions
  transitions: {
    fast: "transition-all duration-150",
    normal: "transition-all duration-200",
    slow: "transition-all duration-300",
    fade: "transition-opacity duration-300"
  },

  // Shadows
  shadows: {
    small: "shadow-lg",
    medium: "shadow-xl",
    large: "shadow-2xl",
    inner: "shadow-inner"
  },

  // Loading States
  loading: {
    spinner: "animate-spin rounded-full border-b-2 border-white",
    pulse: "animate-pulse",
    fade: "animate-fade-in"
  }
} as const

// Theme utility functions
export const createThemeClass = (...classes: string[]) => classes.join(' ')

export const getGlassmorphicStyle = (variant: keyof typeof GLOBAL_THEME.glassmorphic = 'primary') => 
  GLOBAL_THEME.glassmorphic[variant]

export const getBackgroundStyle = (variant: keyof typeof GLOBAL_THEME.backgrounds = 'primary') => 
  GLOBAL_THEME.backgrounds[variant]

export const getTextStyle = (variant: keyof typeof GLOBAL_THEME.text = 'primary') => 
  GLOBAL_THEME.text[variant]

export const getBorderStyle = (variant: keyof typeof GLOBAL_THEME.borders = 'primary') => 
  GLOBAL_THEME.borders[variant]

export const getTransitionStyle = (variant: keyof typeof GLOBAL_THEME.transitions = 'normal') => 
  GLOBAL_THEME.transitions[variant]

// Predefined component styles
export const COMPONENT_STYLES = {
  // Auth forms (login, signup, etc.)
  authCard: createThemeClass(
    getGlassmorphicStyle('primary'),
    getTransitionStyle('fade'),
    'relative',
    GLOBAL_THEME.zIndex.content
  ),

  // Loading screens
  loadingContainer: createThemeClass(
    'min-h-screen flex items-center justify-center',
    getBackgroundStyle('loading')
  ),

  loadingCard: createThemeClass(
    'flex flex-col items-center space-y-4',
    getGlassmorphicStyle('primary'),
    'rounded-xl p-8',
    GLOBAL_THEME.zIndex.content
  ),

  // Dashboard chrome
  dashboardSidebar: createThemeClass(
    getGlassmorphicStyle('secondary'),
    'border-r',
    getBorderStyle('primary')
  ),

  dashboardHeader: createThemeClass(
    getGlassmorphicStyle('secondary'),
    'border-b',
    getBorderStyle('primary')
  ),

  dashboardContent: createThemeClass(
    getGlassmorphicStyle('primary'),
    'rounded-xl p-6'
  ),

  // Buttons
  primaryButton: createThemeClass(
    'bg-gradient-to-r from-blue-600 to-purple-600',
    'hover:from-blue-700 hover:to-purple-700',
    getTextStyle('primary'),
    'font-medium',
    getTransitionStyle('normal')
  ),

  secondaryButton: createThemeClass(
    getGlassmorphicStyle('interactive'),
    getTextStyle('primary'),
    'font-medium'
  ),

  // Input fields
  input: createThemeClass(
    getGlassmorphicStyle('interactive'),
    getTextStyle('primary'),
    'placeholder:text-white/50',
    'focus:ring-2 focus:ring-blue-500/50'
  ),

  // Modals and dialogs
  modal: createThemeClass(
    getGlassmorphicStyle('primary'),
    GLOBAL_THEME.zIndex.modal
  ),

  modalOverlay: createThemeClass(
    getGlassmorphicStyle('overlay'),
    GLOBAL_THEME.zIndex.overlay
  )
} as const

export default GLOBAL_THEME