import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/config.js';

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Behind the Vercel rewrite WebSockets cannot be forwarded, so use long polling there.
    const s = io(API_URL || undefined, {
      withCredentials: true,
      transports: API_URL ? undefined : ['polling'],
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  return socket;
}
