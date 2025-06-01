
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings } from 'lucide-react';

interface ControlPanelProps {
  confidence: number;
  overlap: number;
  onConfidenceChange: (value: number) => void;
  onOverlapChange: (value: number) => void;
}

const ControlPanel = ({ 
  confidence, 
  overlap, 
  onConfidenceChange, 
  onOverlapChange 
}: ControlPanelProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-orange-400" />
          Detection Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-medium text-gray-300 mb-2 block">
            Confidence Threshold: {confidence}%
          </Label>
          <Slider
            value={[confidence]}
            onValueChange={(value) => onConfidenceChange(value[0])}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum confidence for object detection
          </p>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-300 mb-2 block">
            Overlap Threshold: {overlap}%
          </Label>
          <Slider
            value={[overlap]}
            onValueChange={(value) => onOverlapChange(value[0])}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum overlap between detections
          </p>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">ESP32 Config</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>IP: 192.168.135.247</div>
            <div>Endpoint: /capture</div>
            <div>Model: locket v2</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
