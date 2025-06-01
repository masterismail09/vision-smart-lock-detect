
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Wifi, WifiOff, Camera, AlertTriangle } from 'lucide-react';
import DetectionOverlay from '@/components/DetectionOverlay';
import StatsPanel from '@/components/StatsPanel';
import ControlPanel from '@/components/ControlPanel';
import StatusIndicator from '@/components/StatusIndicator';

interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const Index = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(40);
  const [overlap, setOverlap] = useState(30);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTime = useRef(Date.now());

  // ESP32 and Roboflow configuration
  const ESP32_BASE_URL = "http://192.168.135.247";
  const CAPTURE_ENDPOINT = "/capture";

  useEffect(() => {
    // Calculate FPS
    fpsIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - lastFrameTime.current) / 1000;
      if (timeDiff > 0) {
        setFps(Math.round(1 / timeDiff));
      }
    }, 1000);

    return () => {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, []);

  const captureFrame = async () => {
    try {
      const response = await fetch(`${ESP32_BASE_URL}${CAPTURE_ENDPOINT}`, {
        method: 'GET',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      // Update canvas with new frame
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          URL.revokeObjectURL(imageUrl);
          
          setFrameCount(prev => prev + 1);
          lastFrameTime.current = Date.now();
          setIsConnected(true);
          setError(null);
        };
        
        img.src = imageUrl;
      }

      // Simulate object detection (replace with actual Roboflow API call)
      simulateDetection();

    } catch (err) {
      console.error('Frame capture error:', err);
      setIsConnected(false);
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const simulateDetection = () => {
    // Simulate some detections for demo purposes
    // In real implementation, you would call your Roboflow model here
    const mockDetections: Detection[] = [
      {
        class: 'locket',
        confidence: 85.5,
        x: 320,
        y: 240,
        width: 100,
        height: 80
      },
      {
        class: 'locket',
        confidence: 72.3,
        x: 500,
        y: 180,
        width: 90,
        height: 75
      }
    ].filter(() => Math.random() > 0.7); // Randomly show/hide detections

    setDetections(mockDetections);
  };

  const startDetection = () => {
    if (intervalRef.current) return;
    
    setIsRunning(true);
    setFrameCount(0);
    setError(null);
    
    intervalRef.current = setInterval(captureFrame, 200); // 5 FPS
  };

  const stopDetection = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  };

  const toggleDetection = () => {
    if (isRunning) {
      stopDetection();
    } else {
      startDetection();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Live Object Detection
            </h1>
            <p className="text-gray-400 mt-1">Real-time locket detection system</p>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusIndicator isConnected={isConnected} />
            <Button
              onClick={toggleDetection}
              variant={isRunning ? "destructive" : "default"}
              size="lg"
              className="flex items-center gap-2"
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isRunning ? 'Stop' : 'Start'} Detection
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Feed */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-green-400" />
                  Live Feed
                  <Badge variant="outline" className="ml-auto">
                    {fps} FPS
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                    style={{ maxHeight: '500px' }}
                  />
                  <DetectionOverlay detections={detections} />
                  
                  {!isRunning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">Click Start Detection to begin</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            <StatsPanel 
              detections={detections}
              frameCount={frameCount}
              fps={fps}
              isRunning={isRunning}
            />
            
            <ControlPanel
              confidence={confidence}
              overlap={overlap}
              onConfidenceChange={setConfidence}
              onOverlapChange={setOverlap}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
