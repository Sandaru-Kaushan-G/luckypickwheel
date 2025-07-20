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
  Upload
} from 'lucide-react';

interface NavbarProps {
  currentWheelName?: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onCreateNewWheel?: () => void;
  onSaveAs?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentWheelName = "My Wheel",
  isDarkMode = true,
  onToggleDarkMode,
  onCreateNewWheel,
  onSaveAs,
  onSettings,
  onShare
}) => {
  const [selectedWheel, setSelectedWheel] = useState(currentWheelName);
  const wheels = [currentWheelName, "Wheel 2", "Wheel 3"]; // Mock data

  return (
    <nav className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Website name */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gradient">
              PickWheel
            </h1>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-4">
            {/* Switch Wheel Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <span className="hidden sm:inline">Wheel:</span>
                  <span className="max-w-24 truncate">{selectedWheel}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
                <Button variant="outline" size="sm">
                  <File className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">File</span>
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
            <Button variant="outline" size="sm" onClick={onSettings}>
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>

            {/* Share Button */}
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Dark Mode Switch */}
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={onToggleDarkMode}
                aria-label="Toggle dark mode"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;