import { io, Socket } from "socket.io-client";
import { CONFIG } from "@/constants/config";

const SOCKET_URL = CONFIG.API_BASE_URL;

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ["websocket"], // High-speed direct websocket transport
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
      console.log("Connecting to high-speed socket...");
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket || this.connect();
  }
}

export const socketService = new SocketService();
