import { useState, useRef, useEffect } from 'react';

// Interface to define log structure
interface LogEntry {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'waiting';
    timestamp: string;
}
// Interface to define expected props
interface LiveLogProps {
    logs: LogEntry[];
}

// Component to display live logs
export const useLiveLog = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const id_reference = useRef(0);

    // Function to add a new log entry
    const addLog = (message: string, type: LogEntry["type"] = "info") => {
        // https://www.w3schools.com/jsref/jsref_tolocaletimestring.asp 
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
        // Update the logs state with the new log entry
          setLogs(prev => [...prev, {
            id: id_reference.current++,
            message,
            type,
            timestamp
          }]);
    };
    // Function to clear all log entries
    const clearLogs = () => {
        setLogs([]);
        id_reference.current = 0;
    };

    return { logs, addLog, clearLogs };
};

// Component to render the live log entries
const LiveLog = ({ logs }: LiveLogProps) => {
    const logEndRef = useRef<HTMLDivElement>(null);
    // Effect to scroll to the latest log entry whenever logs are updated
    useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);


    // Function to determine styles based on log type
    const getTypeStyles = (type: LogEntry['type']) => {
      switch (type) {
        case 'success':
          return { color: '#00ff00', prefix: '✓' };
        case 'error':
          return { color: '#ff4444', prefix: '✗' };
        case 'waiting':
          return { color: '#ffaa00', prefix: '⏳' };
        default:
          return { color: '#00ff00', prefix: '>' };
      }
    };
    
    // Render the live log container with header and log entries
    return (
        <div className="live-log-container">
          <div className="live-log-header">
            <span className="terminal-icon">▸</span> Live Authentication Log
          </div>
            {/* Container for log entries, using AnimatePresence to handle animations when logs are added or removed  */}
          <div className="live-log-content">
              {logs.length === 0 ? (
              <div className="log-entry waiting">
              <span className="log-prefix">{'>'}</span>
              <span className="log-message">Waiting for authentication...</span>
            </div>
              ) : (
                logs.map((log) => {
                  const styles = getTypeStyles(log.type);
                  return (
                  <div
                      key={log.id}
                      className={`log-entry ${log.type}`}
                    >
                      <span className="log-timestamp">[{log.timestamp}]</span>
                      <span className="log-prefix" style={{ color: styles.color }}>
                        {styles.prefix}
                      </span>
                      <span className="log-message">{log.message}</span>
                </div>
                  );
                })
              )}
          <div ref={logEndRef} />
        </div>
      </div>
    );
  };

export default LiveLog;