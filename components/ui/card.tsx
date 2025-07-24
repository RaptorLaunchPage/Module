import * as React from "react"
import { cn } from "@/lib/utils"

// Enhanced card styling with proper contrast and visibility
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base styles with improved contrast and visibility
      "rounded-lg border shadow-xl",
      // Enhanced glassmorphic background with better contrast
      "bg-black/80 backdrop-blur-lg border-white/40",
      // Improved text visibility
      "text-white",
      // Mobile-optimized styling
      "min-h-fit",
      // Hover effects for better interactivity
      "hover:bg-black/85 hover:border-white/50 transition-all duration-200",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-4 sm:p-6",
      // Ensure header content is visible
      "text-white",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Enhanced title styling with better readability
      "text-lg sm:text-xl lg:text-2xl font-bold leading-tight tracking-tight",
      // High contrast white text
      "text-white",
      // Text shadow for better visibility on any background
      "drop-shadow-lg",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm text-white/90",
      // Better contrast for description text
      "drop-shadow-md",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "p-4 sm:p-6 pt-0",
      // Ensure content text is visible
      "text-white",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-4 sm:p-6 pt-0",
      // Footer text visibility
      "text-white",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
