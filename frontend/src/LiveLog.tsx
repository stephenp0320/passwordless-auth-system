import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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