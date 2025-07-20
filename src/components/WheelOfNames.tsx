import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    setCurrentRotation(0);
    setWinner(null);
    if (wheelRef.current) {
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
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

    // Play spin sound
    playSound(200, 0.1);

    // Calculate random spin (multiple full rotations + random angle)
    const minSpins = 3;
    const maxSpins = 6;
    const spins = Math.random() * (maxSpins - minSpins) + minSpins;
    const randomAngle = Math.random() * 360;
    const totalRotation = currentRotation + (spins * 360) + randomAngle;

    // Apply rotation animation
    if (wheelRef.current) {
      wheelRef.current.style.setProperty('--spin-duration', '3s');
      wheelRef.current.style.setProperty('--final-rotation', `${totalRotation}deg`);
      wheelRef.current.classList.add('wheel-spin');
    }

    // Calculate winner after animation
    setTimeout(() => {
      const normalizedAngle = (360 - (totalRotation % 360)) % 360;
      const segmentAngle = 360 / names.length;
      const winnerIndex = Math.floor(normalizedAngle / segmentAngle);
      const winnerName = names[winnerIndex];

      setWinner(winnerName);
      setCurrentRotation(totalRotation);
      setIsSpinning(false);

      // Play winner sound
      setTimeout(() => playSound(800, 0.3), 100);

      toast({
        title: "🎉 We have a winner!",
        description: `${winnerName} has been selected!`,
      });

      // Remove animation class
      if (wheelRef.current) {
        wheelRef.current.classList.remove('wheel-spin');
        wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
      }
    }, 3000);
  }, [names, currentRotation, playSound]);

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
          <Card className="p-6 bg-gradient-card">
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
          <Card className="p-6 bg-gradient-card">
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

              {/* Wheel SVG */}
              <div className="relative mx-auto w-80 h-80 mb-6">
                <svg width="320" height="320" className="mx-auto">
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
                          className="transition-all duration-200"
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
                          className="pointer-events-none select-none"
                          style={{
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                          }}
                        >
                          {segment.name}
                        </text>
                      </g>
                    ))}
                  </g>
                  
                  {/* Center circle */}
                  <circle
                    cx="160"
                    cy="160"
                    r="20"
                    fill="hsl(var(--primary))"
                    stroke="#1a1a1a"
                    strokeWidth="3"
                  />
                  
                  {/* Pointer */}
                  <polygon
                    points="160,0 175,25 145,25"
                    fill="hsl(var(--primary))"
                    stroke="#1a1a1a"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Controls */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={spinWheel}
                  disabled={isSpinning || names.length < 2}
                  size="lg"
                  className="min-w-32 pulse-glow"
                >
                  {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetWheel}
                  disabled={isSpinning}
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
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