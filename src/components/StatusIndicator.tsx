
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
}

const StatusIndicator = ({ isConnected }: StatusIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi className="h-5 w-5 text-green-400" />
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            Connected
          </Badge>
        </>
      ) : (
        <>
          <WifiOff className="h-5 w-5 text-red-400" />
          <Badge variant="destructive">
            Disconnected
          </Badge>
        </>
      )}
    </div>
  );
};

export default StatusIndicator;
