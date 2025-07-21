import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  File, 
  Settings, 
  Share2, 
  Plus,
  Palette,
  Download,
  Upload,
  Maximize,
  Minimize
} from 'lucide-react';

interface NavbarProps {
  currentWheelName?: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onCreateNewWheel?: () => void;
  onSaveAs?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentWheelName = "My Wheel",
  isDarkMode = true,
  onToggleDarkMode,
  onCreateNewWheel,
  onSaveAs,
  onSettings,
  onShare,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const [selectedWheel, setSelectedWheel] = useState(currentWheelName);
  const wheels = [currentWheelName, "Wheel 2", "Wheel 3"]; // Mock data

  return (
    <nav className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left side - Website name */}
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl font-bold text-gradient">
              PickWheel
            </h1>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
            {/* Switch Wheel Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2">
                  <span className="hidden md:inline text-xs sm:text-sm">Wheel:</span>
                  <span className="max-w-16 sm:max-w-24 truncate text-xs sm:text-sm">{selectedWheel}</span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 sm:w-48">
                {wheels.map((wheel) => (
                  <DropdownMenuItem
                    key={wheel}
                    onClick={() => setSelectedWheel(wheel)}
                    className={selectedWheel === wheel ? "bg-accent" : ""}
                  >
                    {wheel}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateNewWheel}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Wheel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* File Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2 sm:px-3">
                  <File className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline text-xs sm:text-sm">File</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSaveAs}>
                  <Download className="w-4 h-4 mr-2" />
                  Save As...
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Button */}
            <Button variant="outline" size="sm" onClick={onSettings} className="px-2 sm:px-3">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Settings</span>
            </Button>

            {/* Share Button */}
            <Button variant="outline" size="sm" onClick={onShare} className="px-2 sm:px-3">
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden md:inline text-xs sm:text-sm">Share</span>
            </Button>

            {/* Fullscreen Button */}
            {onToggleFullscreen && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onToggleFullscreen} 
                className="px-2 sm:px-3"
                title={`${isFullscreen ? 'Exit' : 'Enter'} Fullscreen`}
              >
                {isFullscreen ? (
                  <Minimize className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                ) : (
                  <Maximize className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                )}
                <span className="hidden lg:inline text-xs sm:text-sm">
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </span>
              </Button>
            )}

            {/* Dark Mode Switch */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={onToggleDarkMode}
                aria-label="Toggle dark mode"
                className="scale-75 sm:scale-100"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;