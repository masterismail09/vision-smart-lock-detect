
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Eye, Clock } from 'lucide-react';

interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StatsPanelProps {
  detections: Detection[];
  frameCount: number;
  fps: number;
  isRunning: boolean;
}

const StatsPanel = ({ detections, frameCount, fps, isRunning }: StatsPanelProps) => {
  const avgConfidence = detections.length > 0 
    ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length 
    : 0;

  const detectionCounts = detections.reduce((acc, detection) => {
    acc[detection.class] = (acc[detection.class] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-400" />
          Detection Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Objects</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {detections.length}
            </div>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Frames</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {frameCount}
            </div>
          </div>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-400">Avg Confidence</span>
          </div>
          <div className="text-xl font-bold text-purple-400">
            {avgConfidence.toFixed(1)}%
          </div>
        </div>

        {Object.keys(detectionCounts).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Detected Classes</h4>
            <div className="space-y-2">
              {Object.entries(detectionCounts).map(([className, count]) => (
                <div key={className} className="flex items-center justify-between">
                  <span className="text-sm">{className}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? 'Running' : 'Stopped'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsPanel;
