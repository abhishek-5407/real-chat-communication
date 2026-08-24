/**
 * Centralized API & WebSocket Configuration
 * Automatically detects current window hostname (localhost or local IP like 192.168.x.x)
 */
export const getHostName = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return window.location.hostname;
  }
  return "localhost";
};

export const API_BASE_URL = `http://${getHostName()}:5000/api`;
export const WEBSOCKET_ENDPOINT = `ws://${getHostName()}:5000`;
