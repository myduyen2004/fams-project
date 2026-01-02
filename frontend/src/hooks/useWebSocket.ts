import { useEffect, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Derive WS_URL from API_URL to ensure protocol matching (http -> http, https -> https)
const getWsUrl = () => {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    return `${apiUrl}/ws`;
};

const WS_URL = getWsUrl();

export const useWebSocket = (topic: string, onMessage: (data: any) => void) => {
    const handleMessage = useCallback((message: any) => {
        if (message.body) {
            try {
                const data = JSON.parse(message.body);
                onMessage(data);
            } catch (e) {
                console.error('Failed to parse WS message:', e);
            }
        }
    }, [onMessage]);

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            debug: (str: string) => {
                console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            client.subscribe(topic, handleMessage);
        };

        client.onStompError = (frame: any) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        client.activate();

        return () => {
            if (client.active) {
                client.deactivate();
            }
        };
    }, [topic, handleMessage]);
};
