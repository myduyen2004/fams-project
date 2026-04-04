import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../services/api/config';

export const useWebSocket = (topic: string, onMessage: (data: any) => void) => {
    const [client, setClient] = useState<Client | null>(null);
    const onMessageRef = useRef(onMessage);

    // Always keep the ref updated with the latest callback
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const stompClient = new Client({
            brokerURL: WS_URL,
            connectHeaders: token ? {
                Authorization: `Bearer ${token}`
            } : {},
            debug: (str: string) => {
                console.debug('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        stompClient.onConnect = () => {
            console.debug('STOMP: Connected to ' + topic);
            stompClient.subscribe(topic, (message) => {
                if (message.body) {
                    try {
                        const data = JSON.parse(message.body);
                        // Use the ref to always call the latest callback
                        onMessageRef.current(data);
                    } catch (e) {
                        console.error('Failed to parse WS message:', e);
                    }
                }
            });
            setClient(stompClient);
        };

        stompClient.onStompError = (frame: any) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        stompClient.activate();

        return () => {
            if (stompClient.active) {
                stompClient.deactivate();
            }
            setClient(null);
        };
    }, [topic]); // Only reconnect when topic changes

    return client;
};
