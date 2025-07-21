import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, RotateCcw, Maximize, Minimize, Volume2, VolumeX, Volume1, Clock, Sparkles, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DragDropNamesList } from './DragDropNamesList';
import Navbar from './Navbar';

interface WheelSegment {
  name: string;
  color: string;
  startAngle: number;
  endAngle: number;
}

const WHEEL_COLORS = [
  'hsl(var(--wheel-color-1))',
  'hsl(var(--wheel-color-2))',
  'hsl(var(--wheel-color-3))',
  'hsl(var(--wheel-color-4))',
  'hsl(var(--wheel-color-5))',
  'hsl(var(--wheel-color-6))',
  'hsl(var(--wheel-color-7))',
  'hsl(var(--wheel-color-8))',
];

const WheelOfNames: React.FC = () => {
  const [names, setNames] = useState<string[]>(['Alice', 'Bob', 'Charlie', 'Diana']);
  const [newName, setNewName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [animationType, setAnimationType] = useState<'classic' | 'elastic' | 'bounce' | 'smooth'>('elastic');
  const [showConfetti, setShowConfetti] = useState(false);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  const [spinIntensity, setSpinIntensity] = useState<'gentle' | 'normal' | 'wild'>('normal');
  const [spinProgress, setSpinProgress] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(0.5); // Volume from 0 to 1
  const [isMuted, setIsMuted] = useState(false);
  const [spinTimer, setSpinTimer] = useState(0); // Timer for spin duration in seconds
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings dialog state
  const [spinDurationLimit, setSpinDurationLimit] = useState(() => {
    // Check if user has a saved preference, otherwise default to 10 seconds
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spinDurationLimit');
      return saved ? parseInt(saved) : 10;
    }
    return 10;
  }); // Max spin duration in seconds
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a saved preference, otherwise default to dark
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('speechEnabled');
      return saved ? saved === 'true' : true;
    }
    return true;
  });
  const [customColors, setCustomColors] = useState<string[]>([...WHEEL_COLORS]);
  const wheelRef = useRef<SVGGElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Save speech setting to localStorage
  useEffect(() => {
    localStorage.setItem('speechEnabled', speechEnabled.toString());
  }, [speechEnabled]);

  // Text-to-speech function
  const speakText = useCallback((text: string) => {
    if (!speechEnabled) return;
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = volume;
      
      // Try to use a more pleasant voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  }, [speechEnabled, volume]);

  // Reorder names function for drag and drop
  const reorderNames = useCallback((newNames: string[]) => {
    setNames(newNames);
    toast({
      title: "Names reordered",
      description: "The order of names has been updated.",
    });
  }, []);

  // Create wheel segments based on names
  const createSegments = useCallback((): WheelSegment[] => {
    if (names.length === 0) return [];
    
    const segmentAngle = 360 / names.length;
    return names.map((name, index) => ({
      name,
      color: customColors[index % customColors.length],
      startAngle: index * segmentAngle,
      endAngle: (index + 1) * segmentAngle,
    }));
  }, [names]);

  const segments = createSegments();

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number) => {
    if (isMuted || volume === 0) return; // Don't play if muted or volume is 0
    
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.log('Web Audio API not supported');
        return;
      }
    }

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(0.1 * volume, audioContextRef.current.currentTime); // Apply volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, [isMuted, volume]);

  // Add new name
  const addName = useCallback(() => {
    if (newName.trim() && !names.includes(newName.trim()) && names.length < 20) {
      setNames(prev => [...prev, newName.trim()]);
      setNewName('');
      toast({
        title: "Name added!",
        description: `${newName.trim()} has been added to the wheel.`,
      });
    } else if (names.includes(newName.trim())) {
      toast({
        title: "Duplicate name",
        description: "This name is already on the wheel.",
        variant: "destructive",
      });
    } else if (names.length >= 20) {
      toast({
        title: "Maximum reached",
        description: "You can only have up to 20 names on the wheel.",
        variant: "destructive",
      });
    }
  }, [newName, names]);

  // Remove name
  const removeName = useCallback((index: number) => {
    setNames(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Name removed",
      description: "Name has been removed from the wheel.",
    });
  }, []);

  // Reset wheel
  const resetWheel = useCallback(() => {
    // Start reset animation
    setIsResetting(true);
    
    // Reset wheel position and winner
    setCurrentRotation(0);
    setWinner(null);
    
    // Reset animation states
    setIsSpinning(false);
    setShowConfetti(false);
    setHighlightedSegment(null);
    setSpinProgress(0);
    setSpinTimer(0);
    
    // Reset animation settings to defaults
    setAnimationType('elastic');
    setSpinIntensity('normal');
    
    // Reset wheel transform and remove any animation classes
    if (wheelRef.current) {
      wheelRef.current.style.transform = 'rotate(0deg)';
      wheelRef.current.classList.remove('wheel-spin', 'wheel-spin-elastic', 'wheel-spin-bounce', 'wheel-spin-smooth');
      // Clear any CSS custom properties
      wheelRef.current.style.removeProperty('--spin-duration');
      wheelRef.current.style.removeProperty('--final-rotation');
    }

    // Clear any running intervals or timeouts
    // (The component will handle cleanup through useEffect)
    
    // Show reset confirmation
    toast({
      title: "🔄 Wheel Reset",
      description: "All settings and animations have been reset to default.",
    });

    // End reset animation after a short delay
    setTimeout(() => {
      setIsResetting(false);
    }, 600);
  }, []);

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    if (!wheelContainerRef.current) return;

    if (!document.fullscreenElement) {
      wheelContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast({
          title: "Fullscreen Mode",
          description: "Press ESC to exit fullscreen",
        });
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
        toast({
          title: "Fullscreen Error",
          description: "Could not enter fullscreen mode",
          variant: "destructive",
        });
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Volume controls
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Sound On" : "Sound Off",
      description: `Volume ${isMuted ? 'enabled' : 'muted'}`,
    });
  }, [isMuted]);

  const adjustVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (clampedVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement) return;

      switch (event.key.toLowerCase()) {
        case 'f':
          if (!isSpinning) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'm':
          event.preventDefault();
          toggleMute();
          break;
        case 'arrowup':
        case '+':
        case '=':
          event.preventDefault();
          adjustVolume(volume + 0.1);
          break;
        case 'arrowdown':
        case '-':
          event.preventDefault();
          adjustVolume(volume - 0.1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [volume, isSpinning, toggleFullscreen, toggleMute, adjustVolume]);

  // Spin the wheel
  const spinWheel = useCallback(() => {
    if (names.length < 2) {
      toast({
        title: "Not enough names",
        description: "Add at least 2 names to spin the wheel.",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    setWinner(null);
    setShowConfetti(false);
    setHighlightedSegment(null);
    setSpinTimer(0); // Reset timer

    // Play spin sound
    playSound(200, 0.1);

    // Calculate spin parameters based on intensity and duration limit
    const intensityConfig = {
      gentle: { minSpins: 2, maxSpins: 4 },
      normal: { minSpins: 3, maxSpins: 6 },
      wild: { minSpins: 5, maxSpins: 8 }
    };

    const config = intensityConfig[spinIntensity];
    const spins = Math.random() * (config.maxSpins - config.minSpins) + config.minSpins;
    const randomAngle = Math.random() * 360;
    const totalRotation = currentRotation + (spins * 360) + randomAngle;

    // Use the spin duration limit from settings (convert to milliseconds)
    const animationDuration = spinDurationLimit * 1000;
    const durationInSeconds = `${spinDurationLimit}s`;

    // Apply different animation types
    if (wheelRef.current) {
      wheelRef.current.style.setProperty('--spin-duration', durationInSeconds);
      wheelRef.current.style.setProperty('--final-rotation', `${totalRotation}deg`);
      
      // Remove existing animation classes
      wheelRef.current.classList.remove('wheel-spin', 'wheel-spin-elastic', 'wheel-spin-bounce', 'wheel-spin-smooth');
      
      // Add animation class based on type
      const animationClass = `wheel-spin-${animationType}`;
      wheelRef.current.classList.add(animationClass);
    }

    // Add segment highlighting during spin
    const highlightInterval = setInterval(() => {
      setHighlightedSegment(Math.floor(Math.random() * names.length));
    }, 100);

    // Progress tracking
    const progressInterval = setInterval(() => {
      setSpinProgress((prev) => {
        const newProgress = prev + (100 / (animationDuration / 100));
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 100);

    // Timer tracking (limited by settings)
    const timerInterval = setInterval(() => {
      setSpinTimer((prev) => {
        const newTimer = prev + 0.1;
        return newTimer > spinDurationLimit ? spinDurationLimit : newTimer;
      });
    }, 100);

    // Calculate winner after animation
    setTimeout(() => {
      clearInterval(highlightInterval);
      clearInterval(progressInterval);
      clearInterval(timerInterval);
      setSpinProgress(0);
      setSpinTimer(0);
      
      const normalizedAngle = (360 - (totalRotation % 360)) % 360;
      const segmentAngle = 360 / names.length;
      const winnerIndex = Math.floor(normalizedAngle / segmentAngle);
      const winnerName = names[winnerIndex];

      setWinner(winnerName);
      setHighlightedSegment(winnerIndex);
      setCurrentRotation(totalRotation);
      setShowConfetti(true);
      setShowWinnerModal(true);
      
      // Hide confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
      
      // Winner celebration sequence
      setTimeout(() => {
        setIsSpinning(false);
        playSound(800, 0.3);
        
        // Announce winner with text-to-speech
        speakText(`Congratulations ${winnerName}! You are the winner!`);
        
        toast({
          title: "🎉 We have a winner!",
          description: `${winnerName} has been selected!`,
        });
      }, 500);

      // Remove animation class and set final rotation
      setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.classList.remove('wheel-spin', 'wheel-spin-elastic', 'wheel-spin-bounce', 'wheel-spin-smooth');
          wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
        }
      }, 100);
    }, animationDuration);
  }, [names, currentRotation, playSound, animationType, spinIntensity, spinDurationLimit]);

  // Generate SVG path for pie segment
  const createPath = (startAngle: number, endAngle: number, radius: number = 200, centerX: number = 210, centerY: number = 210): string => {
    const startAngleRad = (startAngle - 90) * Math.PI / 180;
    const endAngleRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", centerX, centerY,
      "L", x1, y1,
      "A", radius, radius, 0, largeArcFlag, 1, x2, y2,
      "Z"
    ].join(" ");
  };

  // Handle Enter key for adding names
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addName();
    }
  };

  // Navbar handlers
  const handleCreateNewWheel = () => {
    setNames([]);
    setWinner(null);
    resetWheel();
    toast({
      title: "New wheel created",
      description: "Start fresh with a new wheel!",
    });
  };

  const handleSaveAs = () => {
    const data = { names, winner, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wheel-of-names-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Wheel saved",
      description: "Your wheel has been saved as a JSON file.",
    });
  };

  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleShare = () => {
    try {
      if (navigator.share) {
        navigator.share({
          title: 'Wheel of Names',
          text: `Check out my wheel with ${names.length} names!`,
          url: window.location.href,
        }).catch((error) => {
          // If share fails, fall back to clipboard
          navigator.clipboard.writeText(window.location.href);
          toast({
            title: "Link copied",
            description: "Wheel link has been copied to clipboard.",
          });
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Wheel link has been copied to clipboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to share or copy link.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar
        currentWheelName="My Wheel"
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onCreateNewWheel={handleCreateNewWheel}
        onSaveAs={handleSaveAs}
        onSettings={handleSettings}
        onShare={handleShare}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      
      <div className="p-2 sm:p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-gradient mb-2 sm:mb-4">
              Spin to Win!
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Add names and spin the wheel to pick a random winner!
            </p>
          </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start min-h-[500px] sm:min-h-[600px]">
          {/* Names Management */}
          <Card className="p-3 sm:p-4 lg:p-6 modern-card h-fit order-2 xl:order-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
              Manage Names
            </h2>
            
            {/* Add Name Input */}
            <div className="flex gap-2 mb-3 sm:mb-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a name..."
                disabled={isSpinning}
                className="flex-1 modern-button text-sm sm:text-base"
              />
              <Button 
                onClick={addName} 
                disabled={isSpinning || !newName.trim()}
                className="px-2 sm:px-3 modern-button"
                size="sm"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>

            {/* Drag and Drop Names List */}
            <DragDropNamesList
              names={names}
              onReorder={reorderNames}
              onRemove={removeName}
              isSpinning={isSpinning}
            />
          </Card>

          {/* Wheel */}
          <Card 
            ref={wheelContainerRef}
            className={`p-4 sm:p-6 lg:p-8 modern-card relative flex flex-col justify-center min-h-[500px] sm:min-h-[600px] order-1 xl:order-2 ${
              isResetting ? 'reset-flash' : ''
            } ${isFullscreen ? 'fullscreen-wheel' : ''}`}
          >
            {/* Timer Bar - Bottom Left */}
            {isSpinning && (
              <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10 controls-fade-in">
                <div className="flex flex-col items-center gap-1 sm:gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 shadow-lg">
                  <div className="text-xs text-muted-foreground font-medium">Timer</div>
                  
                  {/* Vertical Timer Bar */}
                  <div className="relative h-16 sm:h-24 w-2 bg-secondary rounded-full">
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-orange-500 rounded-full transition-all duration-200"
                      style={{
                        height: `${(spinTimer / spinDurationLimit) * 100}%`
                      }}
                    />
                  </div>
                  
                  <span className="text-xs text-muted-foreground">
                    {spinTimer.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}

            {/* Fullscreen Button - Bottom Right */}
            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-10 controls-fade-in">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                disabled={isSpinning}
                className="p-1.5 sm:p-2 h-7 w-7 sm:h-8 sm:w-8 bg-background/90 backdrop-blur-sm shadow-lg"
                title={`${isFullscreen ? 'Exit' : 'Enter'} Fullscreen (Press F)`}
              >
                {isFullscreen ? (
                  <Minimize className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
              </Button>
            </div>

            <div className="text-center flex flex-col justify-center flex-1">
              {/* Winner Display */}
              {winner && (
                <div className={`mb-4 sm:mb-6 lg:mb-8 winner-celebration ${isFullscreen ? 'fullscreen-winner' : ''}`}>
                  <div className={`mb-2 sm:mb-4 ${
                    isFullscreen ? 'text-6xl sm:text-8xl' : 'text-4xl sm:text-5xl lg:text-6xl'
                  }`}>🎉</div>
                  <h3 className={`font-bold text-gradient winner-text ${
                    isFullscreen ? 'text-2xl sm:text-4xl lg:text-6xl' : 'text-xl sm:text-2xl lg:text-3xl'
                  }`}>
                    Winner: {winner}
                  </h3>
                </div>
              )}

              {/* Spinning Progress - Hidden in fullscreen */}
              {isSpinning && !isFullscreen && (
                <div className="mb-4 sm:mb-6 lg:mb-8">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className="text-sm sm:text-base font-medium">Spinning...</span>
                    <span className="text-sm sm:text-base text-muted-foreground">{Math.round(spinProgress)}%</span>
                  </div>
                  <Progress value={spinProgress} className="w-full max-w-xs sm:max-w-sm mx-auto h-2" />
                </div>
              )}

              {/* Wheel SVG */}
              <div className={`relative mx-auto mb-4 sm:mb-6 lg:mb-8 ${
                isFullscreen ? 'w-80 h-80 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px]' : 'w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px]'
              } ${!isSpinning ? 'wheel-float' : ''} flex items-center justify-center`}>
                {/* Hint text for center button - Hidden in fullscreen */}
                {names.length >= 2 && !isSpinning && !winner && !isFullscreen && (
                  <div className="absolute -bottom-8 sm:-bottom-12 left-1/2 transform -translate-x-1/2 text-xs sm:text-sm text-muted-foreground animate-pulse">
                    Click center to spin
                  </div>
                )}
                
                {/* Keyboard shortcuts help (fullscreen mode only) */}
                {isFullscreen && (
                  <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground text-center">
                    <div className="bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
                      <div className="hidden sm:block">
                        Press <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">F</kbd> for fullscreen • 
                        <kbd className="px-1 py-0.5 bg-secondary rounded text-xs mx-1">M</kbd> to mute • 
                        <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">+/-</kbd> for volume • 
                        <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">ESC</kbd> to exit
                      </div>
                      <div className="sm:hidden">
                        <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">F</kbd> fullscreen • 
                        <kbd className="px-1 py-0.5 bg-secondary rounded text-xs mx-1">M</kbd> mute • 
                        <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">ESC</kbd> exit
                      </div>
                    </div>
                  </div>
                )}
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox={`0 0 ${isFullscreen ? "500" : "420"} ${isFullscreen ? "500" : "420"}`}
                  className="mx-auto drop-shadow-2xl"
                >
                  {/* Wheel segments */}
                  <g ref={wheelRef} style={{ 
                    transformOrigin: isFullscreen ? '250px 250px' : '210px 210px' 
                  }}>
                    {segments.map((segment, index) => (
                      <g key={index}>
                        {/* Segment */}
                        <path
                          d={createPath(
                            segment.startAngle, 
                            segment.endAngle, 
                            isFullscreen ? 240 : 200,
                            isFullscreen ? 250 : 210,
                            isFullscreen ? 250 : 210
                          )}
                          fill={segment.color}
                          stroke="#1a1a1a"
                          strokeWidth="2"
                          className={`transition-all duration-200 ${
                            highlightedSegment === index ? 'segment-highlight' : ''
                          }`}
                          style={{
                            filter: highlightedSegment === index 
                              ? 'brightness(1.3) drop-shadow(0 0 15px currentColor)' 
                              : 'brightness(1)'
                          }}
                        />
                        {/* Text */}
                        <text
                          x={(isFullscreen ? 250 : 210) + (isFullscreen ? 160 : 130) * Math.cos(((segment.startAngle + segment.endAngle) / 2 - 90) * Math.PI / 180)}
                          y={(isFullscreen ? 250 : 210) + (isFullscreen ? 160 : 130) * Math.sin(((segment.startAngle + segment.endAngle) / 2 - 90) * Math.PI / 180)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={isFullscreen ? "18" : "14"}
                          fontWeight="bold"
                          className={`pointer-events-none select-none transition-all duration-200 ${
                            highlightedSegment === index ? 'animate-pulse' : ''
                          }`}
                          style={{
                            textShadow: highlightedSegment === index 
                              ? '2px 2px 8px rgba(0,0,0,0.9)' 
                              : '1px 1px 2px rgba(0,0,0,0.8)'
                          }}
                        >
                          {segment.name}
                        </text>
                      </g>
                    ))}
                  </g>
                  
                  {/* Center spin button with live animation */}
                  <g 
                    className={`cursor-pointer transition-all duration-300 ${
                      names.length < 2 ? 'opacity-50 cursor-not-allowed' : 'spin-button-hover'
                    } ${isSpinning ? 'spin-button-active spin-button-glow' : names.length >= 2 ? 'spin-button-glow' : ''}`}
                    onClick={names.length >= 2 && !isSpinning ? spinWheel : undefined}
                  >
                    {/* Outer breathing ring - always visible when ready */}
                    {!isSpinning && names.length >= 2 && (
                      <circle
                        cx={isFullscreen ? "250" : "210"}
                        cy={isFullscreen ? "250" : "210"}
                        r={isFullscreen ? "45" : "38"}
                        fill="none"
                        stroke="hsl(var(--primary) / 0.3)"
                        strokeWidth="2"
                        className="animate-ping"
                        style={{
                          animationDuration: '3s',
                          filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.3))'
                        }}
                      />
                    )}
                    
                    {/* Main button circle */}
                    <circle
                      cx={isFullscreen ? "250" : "210"}
                      cy={isFullscreen ? "250" : "210"}
                      r={isFullscreen ? "35" : "28"}
                      fill="hsl(var(--primary))"
                      stroke="#1a1a1a"
                      strokeWidth="3"
                      className="transition-all duration-300"
                      style={{
                        filter: isSpinning 
                          ? 'brightness(1.1) drop-shadow(0 0 20px hsl(var(--primary) / 0.6))' 
                          : 'drop-shadow(0 0 10px rgba(0,0,0,0.3))'
                      }}
                    />
                    
                    {/* Animated ring - live animation when not spinning */}
                    <circle
                      cx={isFullscreen ? "250" : "210"}
                      cy={isFullscreen ? "250" : "210"}
                      r={isFullscreen ? "28" : "22"}
                      fill="none"
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth="3"
                      strokeDasharray={isFullscreen ? "88 88" : "69 69"}
                      className={isSpinning ? 'spin-ring-active' : names.length >= 2 ? 'spin-ring' : 'opacity-30'}
                      style={{
                        transformOrigin: isFullscreen ? '250px 250px' : '210px 210px'
                      }}
                    />
                    
                    {/* Pulsing inner circle */}
                    <circle
                      cx={isFullscreen ? "250" : "210"}
                      cy={isFullscreen ? "250" : "210"}
                      r={isFullscreen ? "22" : "18"}
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="1"
                      className={names.length >= 2 ? 'animate-pulse' : 'opacity-20'}
                    />
                    
                    {/* Rotating sparkle effect */}
                    {!isSpinning && names.length >= 2 && (
                      <g style={{
                        animation: 'spin 6s linear infinite',
                        transformOrigin: isFullscreen ? '250px 250px' : '210px 210px'
                      }}>
                        <circle 
                          cx={isFullscreen ? "250" : "210"} 
                          cy={isFullscreen ? "220" : "190"} 
                          r="2" 
                          fill="rgba(255,255,255,0.8)"
                          className="animate-pulse"
                        />
                        <circle 
                          cx={isFullscreen ? "280" : "230"} 
                          cy={isFullscreen ? "250" : "210"} 
                          r="1.5" 
                          fill="rgba(255,255,255,0.6)"
                          className="animate-pulse"
                          style={{animationDelay: '0.5s'}}
                        />
                        <circle 
                          cx={isFullscreen ? "250" : "210"} 
                          cy={isFullscreen ? "280" : "230"} 
                          r="2" 
                          fill="rgba(255,255,255,0.8)"
                          className="animate-pulse"
                          style={{animationDelay: '1s'}}
                        />
                        <circle 
                          cx={isFullscreen ? "220" : "190"} 
                          cy={isFullscreen ? "250" : "210"} 
                          r="1.5" 
                          fill="rgba(255,255,255,0.6)"
                          className="animate-pulse"
                          style={{animationDelay: '1.5s'}}
                        />
                      </g>
                    )}
                    
                    {/* Animated SPIN text with live effects */}
                    <text
                      x={isFullscreen ? "250" : "210"}
                      y={isFullscreen ? "257" : "217"}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={isFullscreen ? "16" : "12"}
                      fontWeight="bold"
                      className={`pointer-events-none select-none transition-all duration-300 ${
                        isSpinning ? 'animate-pulse' : names.length >= 2 ? 'animate-pulse' : ''
                      }`}
                      style={{
                        textShadow: isSpinning 
                          ? '0 0 8px rgba(255,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.8)'
                          : names.length >= 2 
                            ? '0 0 4px rgba(255,255,255,0.6), 2px 2px 4px rgba(0,0,0,0.8)'
                            : '2px 2px 4px rgba(0,0,0,0.8)',
                        letterSpacing: '1px',
                        animationDuration: names.length >= 2 ? '2s' : '1s'
                      }}
                    >
                      {isSpinning ? '•••' : 'SPIN'}
                    </text>
                  </g>
                  
                  {/* Pointer */}
                  <polygon
                    points={isFullscreen ? "250,0 270,32 230,32" : "210,0 225,25 195,25"}
                    fill="hsl(var(--primary))"
                    stroke="#1a1a1a"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Animation Controls - Hidden in fullscreen */}
              {!isFullscreen && (
                <div className={`mb-4 sm:mb-6 lg:mb-8 space-y-4 sm:space-y-6 transition-all duration-500 ${
                  isResetting ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                }`}>
                  <div className="text-center max-w-xs sm:max-w-sm lg:max-w-lg mx-auto">
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      {/* Animation Style Dropdown */}
                      <div className="space-y-2 sm:space-y-3">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground">
                          Animation Style {isResetting && '(Resetting...)'}
                        </h3>
                        <Select
                          value={animationType}
                          onValueChange={(value) => setAnimationType(value as any)}
                          disabled={isSpinning || isResetting}
                        >
                          <SelectTrigger className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium">
                            <SelectValue placeholder="Select animation style" />
                          </SelectTrigger>
                          <SelectContent className="min-w-[280px] sm:min-w-[300px]">
                            <SelectItem value="classic" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">⚙️</span>
                                <span>Classic - Traditional spinning</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="elastic" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">🎯</span>
                                <span>Elastic - Bouncy finish</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="bounce" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">🏀</span>
                                <span>Bounce - Spring effect</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="smooth" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">✨</span>
                                <span>Smooth - Gradual slowdown</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Spin Intensity Dropdown */}
                      <div className="space-y-2 sm:space-y-3">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground">
                          Spin Intensity {isResetting && '(Resetting...)'}
                        </h3>
                        <Select
                          value={spinIntensity}
                          onValueChange={(value) => setSpinIntensity(value as any)}
                          disabled={isSpinning || isResetting}
                        >
                          <SelectTrigger className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium">
                            <SelectValue placeholder="Select spin intensity" />
                          </SelectTrigger>
                          <SelectContent className="min-w-[280px] sm:min-w-[300px]">
                            <SelectItem value="gentle" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">🐢</span>
                                <span>Gentle - Slow and steady</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="normal" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">⚡</span>
                                <span>Normal - Balanced speed</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="wild" className="text-sm sm:text-base py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-lg sm:text-xl">🚀</span>
                                <span>Wild - Fast and exciting</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confetti Effect */}
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden" ref={confettiRef}>
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute confetti"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                        backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
                        width: `${4 + Math.random() * 6}px`,
                        height: `${4 + Math.random() * 6}px`,
                        borderRadius: Math.random() > 0.5 ? '50%' : '0'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Controls - Simplified in fullscreen */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mt-4 sm:mt-6 lg:mt-8">
                {!isFullscreen ? (
                  <>
                    <Button
                      onClick={spinWheel}
                      disabled={isSpinning || names.length < 2}
                      variant="outline"
                      size="lg"
                      className="min-w-32 sm:min-w-36 h-10 sm:h-12 text-sm sm:text-base modern-button"
                    >
                      {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={resetWheel}
                      disabled={isSpinning || isResetting}
                      size="lg"
                      className={`h-10 sm:h-12 text-sm sm:text-base modern-button ${isResetting ? 'button-press' : ''}`}
                    >
                      <RotateCcw className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={spinWheel}
                    disabled={isSpinning || names.length < 2}
                    variant="outline"
                    size="lg"
                    className="min-w-40 sm:min-w-48 text-lg sm:text-xl px-8 sm:px-10 py-3 sm:py-4 modern-button"
                  >
                    {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Wheel Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Spin Duration Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Spin Duration Limit</Label>
              <div className="space-y-2">
                <Slider
                  value={[spinDurationLimit]}
                  onValueChange={(value) => setSpinDurationLimit(value[0])}
                  max={60}
                  min={3}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>3s</span>
                  <span className="font-medium">{spinDurationLimit}s</span>
                  <span>60s</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum time the wheel can spin (affects timer bar display)
              </p>
            </div>

            <Separator />

            {/* Time Bar Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Time Bar Preview</Label>
              <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                <div className="text-xs text-muted-foreground">Timer</div>
                <div className="relative h-16 w-2 bg-secondary rounded-full">
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{
                      height: `50%` // Show 50% as preview
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {(spinDurationLimit / 2).toFixed(1)}s / {spinDurationLimit}s
                </div>
              </div>
            </div>

            <Separator />

            {/* Text-to-Speech Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Text-to-Speech</Label>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm">Announce winner</span>
                  <span className="text-xs text-muted-foreground">
                    Voice announcement when someone wins
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className={speechEnabled ? 'text-primary' : 'text-muted-foreground'}
                >
                  {speechEnabled ? 'On' : 'Off'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Volume Settings */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Volume Settings</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="p-1 h-8 w-8"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-destructive" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={(value) => adjustVolume(value[0])}
                    max={1}
                    min={0}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSpinDurationLimit(10);
                  setVolume(0.5);
                  setIsMuted(false);
                  toast({
                    title: "Settings Reset",
                    description: "All settings have been reset to default values.",
                  });
                }}
              >
                Reset to Default
              </Button>
              <Button onClick={() => setIsSettingsOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Winner Congratulations Modal */}
      <Dialog open={showWinnerModal} onOpenChange={setShowWinnerModal}>
        <DialogContent className="sm:max-w-[425px] text-center">
          <DialogHeader>
            <DialogTitle className="text-3xl text-gradient mb-4">
              🎉 Congratulations! 🎉
            </DialogTitle>
          </DialogHeader>
          
          {winner && (
            <div className="py-6">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-gradient mb-2">
                {winner}
              </h3>
              <p className="text-muted-foreground mb-6">
                You are the winner!
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setShowWinnerModal(false)}
                  className="modern-button"
                >
                  Awesome! 🎊
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowWinnerModal(false);
                    resetWheel();
                  }}
                  className="modern-button"
                >
                  Spin Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WheelOfNames;