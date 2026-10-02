import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class SensorsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  emitSensorUpdate(data: any) {
    this.server.emit('sensor-update', data);
  }

  emitValveUpdate(data: any) {
    this.server.emit('valve-update', data);
  }

  emitAlert(data: any) {
    this.server.emit('alert', data);
  }
}
