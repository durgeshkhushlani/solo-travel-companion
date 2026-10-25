import { createContext, useContext } from 'react';

const NotificationContext = createContext({ notify: () => {} });

// TODO: toast queue + unread chat badges
export const NotificationProvider = NotificationContext.Provider;
export const useNotifications = () => useContext(NotificationContext);
