
interface Detection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectionOverlayProps {
  detections: Detection[];
}

const DetectionOverlay = ({ detections }: DetectionOverlayProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((detection, index) => {
        const left = detection.x - detection.width / 2;
        const top = detection.y - detection.height / 2;
        
        return (
          <div
            key={index}
            className="absolute border-2 border-green-400 bg-green-400/10 transition-all duration-200"
            style={{
              left: `${(left / 640) * 100}%`,
              top: `${(top / 480) * 100}%`,
              width: `${(detection.width / 640) * 100}%`,
              height: `${(detection.height / 480) * 100}%`,
            }}
          >
            <div className="absolute -top-8 left-0 bg-green-400 text-black px-2 py-1 text-xs font-medium rounded">
              {detection.class}: {detection.confidence.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DetectionOverlay;
