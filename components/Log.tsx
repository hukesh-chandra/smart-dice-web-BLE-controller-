
import React, { useRef, useEffect } from 'react';

interface LogProps {
  logs: string[];
}

export const Log: React.FC<LogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-900 p-3 rounded-lg shadow-inner h-32">
        <div ref={logContainerRef} className="h-full overflow-y-auto">
            {logs.map((log, index) => (
                <p key={index} className="text-xs text-gray-400 font-mono break-all">
                    <span className="text-green-500">&gt; </span>{log}
                </p>
            ))}
        </div>
    </div>
  );
};
