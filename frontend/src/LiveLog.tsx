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


