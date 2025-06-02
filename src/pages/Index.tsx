import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Wifi, WifiOff, Camera, AlertTriangle, Volume2 } from 'lucide-react';
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
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTime = useRef(Date.now());
  const voiceCommandCooldown = useRef<Map<string, number>>(new Map());

  // ESP32 and Roboflow configuration
  const ESP32_BASE_URL = "http://192.168.135.247";
  const CAPTURE_ENDPOINT = "/capture";
  const SPEAKER_BASE_URL = "http://192.168.135.80";
  const PLAY_ENDPOINT = "/play";
  const ROBOFLOW_API_KEY = "1cDbsPHUkHhSTGSCAUrn";
  const WORKSPACE_ID = "yoyo";
  const PROJECT_ID = "locket";
  const MODEL_VERSION = 2;

  // Voice command dictionary
  const VOICE_COMMANDS: Record<string, number> = {
    'blade': 1,
    'cap': 2,
    'toy-truck': 3,
    'battery': 4,
    'crayons': 5
  };

  const COOLDOWN_PERIOD = 30000; // 30 seconds in milliseconds

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

  const sendVoiceCommand = async (objectClass: string) => {
    if (!voiceCommandsEnabled) return;

    const commandNumber = VOICE_COMMANDS[objectClass];
    if (!commandNumber) return;

    const now = Date.now();
    const lastCommand = voiceCommandCooldown.current.get(objectClass);
    
    // Check if we're still in cooldown period
    if (lastCommand && (now - lastCommand) < COOLDOWN_PERIOD) {
      console.log(`Voice command for ${objectClass} is in cooldown. ${Math.round((COOLDOWN_PERIOD - (now - lastCommand)) / 1000)}s remaining`);
      return;
    }

    try {
      console.log(`Sending voice command for ${objectClass}: ${commandNumber}`);
      
      const response = await fetch(`${SPEAKER_BASE_URL}${PLAY_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: commandNumber.toString()
      });

      if (response.ok) {
        console.log(`✅ Voice command sent successfully for ${objectClass}`);
        voiceCommandCooldown.current.set(objectClass, now);
        setLastVoiceCommand(`${objectClass} (${commandNumber})`);
        
        // Clear the last command display after 3 seconds
        setTimeout(() => setLastVoiceCommand(null), 3000);
      } else {
        console.error(`❌ Failed to send voice command: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error sending voice command for ${objectClass}:`, error);
    }
  };

  const runRoboflowDetection = async (imageBlob: Blob): Promise<Detection[]> => {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob);

      const roboflowUrl = `https://detect.roboflow.com/${PROJECT_ID}/${MODEL_VERSION}?api_key=${ROBOFLOW_API_KEY}&confidence=${confidence}&overlap=${overlap}`;
      
      const response = await fetch(roboflowUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Roboflow API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Roboflow response:', result);

      // Convert Roboflow predictions to our Detection format
      const detections: Detection[] = (result.predictions || []).map((pred: any) => ({
        class: pred.class,
        confidence: pred.confidence * 100, // Convert to percentage
        x: pred.x,
        y: pred.y,
        width: pred.width,
        height: pred.height
      }));

      // Check for voice commands for detected objects
      if (voiceCommandsEnabled && detections.length > 0) {
        const uniqueClasses = new Set(detections.map(d => d.class));
        uniqueClasses.forEach(objectClass => {
          sendVoiceCommand(objectClass);
        });
      }

      return detections;
    } catch (error) {
      console.error('Roboflow detection error:', error);
      return [];
    }
  };

  const captureFrame = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${ESP32_BASE_URL}${CAPTURE_ENDPOINT}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      // Update canvas with new frame
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          setFrameCount(prev => prev + 1);
          lastFrameTime.current = Date.now();
          setIsConnected(true);
          setError(null);

          // Run Roboflow detection on the captured frame
          const detectedObjects = await runRoboflowDetection(blob);
          setDetections(detectedObjects);
        };
        
        const imageUrl = URL.createObjectURL(blob);
        img.src = imageUrl;
        
        // Clean up the URL after setting it
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          URL.revokeObjectURL(imageUrl);
          
          setFrameCount(prev => prev + 1);
          lastFrameTime.current = Date.now();
          setIsConnected(true);
          setError(null);

          // Run Roboflow detection on the captured frame
          const detectedObjects = await runRoboflowDetection(blob);
          setDetections(detectedObjects);
        };
      }

    } catch (err) {
      console.error('Frame capture error:', err);
      setIsConnected(false);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Connection timeout - ESP32 not responding');
      } else {
        setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      // Clear detections on error
      setDetections([]);
    }
  };

  const startDetection = () => {
    if (intervalRef.current) return;
    
    setIsRunning(true);
    setFrameCount(0);
    setError(null);
    
    intervalRef.current = setInterval(captureFrame, 500); // 2 FPS for live detection
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
            <p className="text-gray-400 mt-1">Real-time locket detection with Roboflow AI & Voice Commands</p>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusIndicator isConnected={isConnected} />
            <Button
              onClick={() => setVoiceCommandsEnabled(!voiceCommandsEnabled)}
              variant={voiceCommandsEnabled ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Voice {voiceCommandsEnabled ? 'ON' : 'OFF'}
            </Button>
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

        {/* Voice Command Status */}
        {lastVoiceCommand && (
          <Card className="bg-blue-900/20 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Volume2 className="h-5 w-5" />
                <span>Voice command sent: {lastVoiceCommand}</span>
              </div>
            </CardContent>
          </Card>
        )}

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
                  Live Feed - Roboflow AI Detection
                  <Badge variant="outline" className="ml-auto">
                    {fps} FPS
                  </Badge>
                  {voiceCommandsEnabled && (
                    <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-500">
                      Voice ON
                    </Badge>
                  )}
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
                        <p className="text-sm text-gray-500 mt-2">
                          Using Roboflow '{PROJECT_ID}' model v{MODEL_VERSION}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Voice commands: {voiceCommandsEnabled ? 'Enabled' : 'Disabled'}
                        </p>
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
              voiceCommandsEnabled={voiceCommandsEnabled}
              onVoiceCommandsChange={setVoiceCommandsEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
