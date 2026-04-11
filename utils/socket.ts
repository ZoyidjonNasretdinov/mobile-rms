import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://192.168.43.160:3000";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
      console.log("Connecting to socket...");
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
