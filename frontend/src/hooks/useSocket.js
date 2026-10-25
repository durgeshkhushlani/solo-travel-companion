import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(import.meta.env.VITE_API_URL ?? 'http://localhost:5000', { withCredentials: true });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  return socket;
}
