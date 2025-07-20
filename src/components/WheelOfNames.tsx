import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Trash2, Plus, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has a saved preference, otherwise default to dark
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const wheelRef = useRef<SVGGElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

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

  // Create wheel segments based on names
  const createSegments = useCallback((): WheelSegment[] => {
    if (names.length === 0) return [];
    
    const segmentAngle = 360 / names.length;
    return names.map((name, index) => ({
      name,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      startAngle: index * segmentAngle,
      endAngle: (index + 1) * segmentAngle,
    }));
  }, [names]);

  const segments = createSegments();

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number) => {
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
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, []);

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

    // Play spin sound
    playSound(200, 0.1);

    // Calculate spin parameters based on intensity
    const intensityConfig = {
      gentle: { minSpins: 2, maxSpins: 4, duration: '4s' },
      normal: { minSpins: 3, maxSpins: 6, duration: '3s' },
      wild: { minSpins: 5, maxSpins: 8, duration: '5s' }
    };

    const config = intensityConfig[spinIntensity];
    const spins = Math.random() * (config.maxSpins - config.minSpins) + config.minSpins;
    const randomAngle = Math.random() * 360;
    const totalRotation = currentRotation + (spins * 360) + randomAngle;

    // Apply different animation types
    if (wheelRef.current) {
      wheelRef.current.style.setProperty('--spin-duration', config.duration);
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

    // Calculate animation duration
    const animationDuration = parseFloat(config.duration) * 1000;

    // Progress tracking
    const progressInterval = setInterval(() => {
      setSpinProgress((prev) => {
        const newProgress = prev + (100 / (animationDuration / 100));
        return newProgress > 100 ? 100 : newProgress;
      });
    }, 100);

    // Calculate winner after animation
    setTimeout(() => {
      clearInterval(highlightInterval);
      clearInterval(progressInterval);
      setSpinProgress(0);
      
      const normalizedAngle = (360 - (totalRotation % 360)) % 360;
      const segmentAngle = 360 / names.length;
      const winnerIndex = Math.floor(normalizedAngle / segmentAngle);
      const winnerName = names[winnerIndex];

      setWinner(winnerName);
      setHighlightedSegment(winnerIndex);
      setCurrentRotation(totalRotation);
      setShowConfetti(true);
      
      // Hide confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
      
      // Winner celebration sequence
      setTimeout(() => {
        setIsSpinning(false);
        playSound(800, 0.3);
        
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
  }, [names, currentRotation, playSound, animationType, spinIntensity]);

  // Generate SVG path for pie segment
  const createPath = (startAngle: number, endAngle: number, radius: number = 150): string => {
    const startAngleRad = (startAngle - 90) * Math.PI / 180;
    const endAngleRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = 160 + radius * Math.cos(startAngleRad);
    const y1 = 160 + radius * Math.sin(startAngleRad);
    const x2 = 160 + radius * Math.cos(endAngleRad);
    const y2 = 160 + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", 160, 160,
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
    toast({
      title: "Settings",
      description: "Settings panel coming soon!",
    });
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
      />
      
      <div className="p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-6xl font-bold text-gradient mb-4">
              Spin to Win!
            </h1>
            <p className="text-muted-foreground text-lg">
              Add names and spin the wheel to pick a random winner!
            </p>
          </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Names Management */}
          <Card className="p-6 bg-gradient-card interactive-hover">
            <h2 className="text-2xl font-bold mb-4">Manage Names</h2>
            
            {/* Add Name Input */}
            <div className="flex gap-2 mb-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a name..."
                disabled={isSpinning}
                className="flex-1"
              />
              <Button 
                onClick={addName} 
                disabled={isSpinning || !newName.trim()}
                className="px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Names List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {names.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border"
                >
                  <span className="font-medium">{name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeName(index)}
                    disabled={isSpinning}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {names.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No names added yet. Add some names to get started!
              </p>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              {names.length} names • {names.length < 2 ? 'Add at least 2 names to spin' : 'Ready to spin!'}
            </div>
          </Card>

          {/* Wheel */}
          <Card className={`p-6 bg-gradient-card interactive-hover ${
            isResetting ? 'reset-flash' : ''
          }`}>
            <div className="text-center">
              {/* Winner Display */}
              {winner && (
                <div className="mb-6 winner-celebration">
                  <div className="text-6xl mb-2">🎉</div>
                  <h3 className="text-2xl font-bold text-gradient winner-text">
                    Winner: {winner}
                  </h3>
                </div>
              )}

              {/* Spinning Progress */}
              {isSpinning && (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="text-sm font-medium">Spinning...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(spinProgress)}%</span>
                  </div>
                  <Progress value={spinProgress} className="w-full max-w-xs mx-auto" />
                </div>
              )}

              {/* Wheel SVG */}
              <div className={`relative mx-auto w-80 h-80 mb-6 ${
                !isSpinning ? 'wheel-float' : ''
              }`}>
                {/* Hint text for center button */}
                {names.length >= 2 && !isSpinning && !winner && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground animate-pulse">
                    Click center to spin
                  </div>
                )}
                <svg width="320" height="320" className="mx-auto drop-shadow-2xl">
                  {/* Wheel segments */}
                  <g ref={wheelRef} style={{ transformOrigin: '160px 160px' }}>
                    {segments.map((segment, index) => (
                      <g key={index}>
                        {/* Segment */}
                        <path
                          d={createPath(segment.startAngle, segment.endAngle)}
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
                          x={160 + 100 * Math.cos(((segment.startAngle + segment.endAngle) / 2 - 90) * Math.PI / 180)}
                          y={160 + 100 * Math.sin(((segment.startAngle + segment.endAngle) / 2 - 90) * Math.PI / 180)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="14"
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
                  
                  {/* Center spin button */}
                  <g 
                    className={`cursor-pointer transition-all duration-300 ${
                      names.length < 2 ? 'opacity-50 cursor-not-allowed' : 'spin-button-hover'
                    } ${isSpinning ? 'spin-button-active' : ''}`}
                    onClick={names.length >= 2 && !isSpinning ? spinWheel : undefined}
                  >
                    {/* Main button circle */}
                    <circle
                      cx="160"
                      cy="160"
                      r="35"
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
                    
                    {/* Animated ring when spinning */}
                    <circle
                      cx="160"
                      cy="160"
                      r="30"
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="3"
                      strokeDasharray="94 94"
                      className={isSpinning ? 'spin-ring' : 'opacity-60'}
                      style={{
                        transformOrigin: '160px 160px'
                      }}
                    />
                    
                    {/* Inner glow circle */}
                    <circle
                      cx="160"
                      cy="160"
                      r="25"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1"
                      className={isSpinning ? 'animate-pulse' : ''}
                    />
                    
                    {/* Spin text */}
                    <text
                      x="160"
                      y="165"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      className={`pointer-events-none select-none transition-all duration-300 ${
                        isSpinning ? 'animate-pulse' : ''
                      }`}
                      style={{
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        letterSpacing: '1px'
                      }}
                    >
                      {isSpinning ? '•••' : 'SPIN'}
                    </text>
                    
                    {/* Decorative dots around the button */}
                    {!isSpinning && names.length >= 2 && (
                      <>
                        <circle cx="160" cy="118" r="2" fill="rgba(255,255,255,0.6)" className="animate-pulse" />
                        <circle cx="202" cy="160" r="2" fill="rgba(255,255,255,0.6)" className="animate-pulse" style={{animationDelay: '0.5s'}} />
                        <circle cx="160" cy="202" r="2" fill="rgba(255,255,255,0.6)" className="animate-pulse" style={{animationDelay: '1s'}} />
                        <circle cx="118" cy="160" r="2" fill="rgba(255,255,255,0.6)" className="animate-pulse" style={{animationDelay: '1.5s'}} />
                      </>
                    )}
                  </g>
                  
                  {/* Pointer */}
                  <polygon
                    points="160,0 175,25 145,25"
                    fill="hsl(var(--primary))"
                    stroke="#1a1a1a"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Animation Controls */}
              <div className={`mb-6 space-y-4 transition-all duration-500 ${
                isResetting ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}>
                <div className="text-center">
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                    Animation Style {isResetting && '(Resetting...)'}
                  </h3>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {[
                      { type: 'classic', icon: '⚙️' },
                      { type: 'elastic', icon: '🎯' },
                      { type: 'bounce', icon: '🏀' },
                      { type: 'smooth', icon: '✨' }
                    ].map(({ type, icon }) => (
                      <Button
                        key={type}
                        variant={animationType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnimationType(type as any)}
                        disabled={isSpinning || isResetting}
                        className={`capitalize transition-all duration-300 ${
                          isResetting && animationType !== type ? 'animate-pulse' : ''
                        }`}
                      >
                        {icon} {type}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                    Spin Intensity {isResetting && '(Resetting...)'}
                  </h3>
                  <div className="flex justify-center gap-2">
                    {['gentle', 'normal', 'wild'].map((intensity) => (
                      <Button
                        key={intensity}
                        variant={spinIntensity === intensity ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSpinIntensity(intensity as any)}
                        disabled={isSpinning || isResetting}
                        className={`capitalize transition-all duration-300 ${
                          isResetting && spinIntensity !== intensity ? 'animate-pulse' : ''
                        }`}
                      >
                        {intensity === 'gentle' && '🐢'}
                        {intensity === 'normal' && '⚡'}
                        {intensity === 'wild' && '🚀'}
                        {' '}{intensity}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

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

              {/* Controls */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={spinWheel}
                  disabled={isSpinning || names.length < 2}
                  variant="outline"
                  size="lg"
                  className="min-w-32"
                >
                  {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetWheel}
                  disabled={isSpinning || isResetting}
                  size="lg"
                  className={isResetting ? 'button-press' : ''}
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                  {isResetting ? 'Resetting...' : 'Reset'}
                </Button>
              </div>
            </div>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WheelOfNames;