import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PaymentService } from './payment.service';
import { Logger } from '@nestjs/common';

interface ConnectionMap {
  socket_id: string;
  charge_id: string;
  lastActive: number;
}

@WebSocketGateway({
  cors: true,
  pingInterval: 10000, // Send ping every 10 seconds
  pingTimeout: 5000, // Wait 5 seconds for pong response
})
export class PaymentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentGateway.name);
  private readonly connections = new Map<string, ConnectionMap>();

  constructor() {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      if (!client?.id) {
        this.logger.error(
          'Invalid client connection attempt: Missing client ID',
        );
        client?.disconnect(true);
        return;
      }

      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
      client?.disconnect(true);
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    try {
      if (!client?.id) {
        this.logger.error('Invalid client disconnection: Missing client ID');
        return;
      }

      this.logger.log(`Client disconnected: ${client.id}`);

      // Remove the disconnected client from connections
      for (const [key, value] of this.connections.entries()) {
        if (value.socket_id === client.id) {
          this.connections.delete(key);
          this.logger.log(`Removed connection for client: ${client.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error in handleDisconnect:', error);
    }
  }

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { user_id: string; charge_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client?.id) {
        throw new Error('Client ID is undefined');
      }

      if (!data?.user_id || !data?.charge_id) {
        throw new Error('Invalid registration data');
      }

      const { user_id, charge_id } = data;
      const key = `${user_id}:${charge_id}`;

      this.connections.set(key, {
        socket_id: client.id,
        charge_id,
        lastActive: Date.now(),
      });

      this.logger.log(
        `Registered user_id: ${user_id}, charge_id: ${charge_id}`,
      );

      await this.sendToUserWithCharge(user_id, charge_id, '');
    } catch (error) {
      this.logger.error('Error in handleRegister:', error);
      client?.emit('error', { message: 'Registration failed' });
    }
  }

  async sendToUserWithCharge(
    user_id: string,
    charge_id: string,
    status: string,
  ) {
    try {
      const key = `${user_id}:${charge_id}`;
      const connection = this.connections.get(key);

      if (!connection) {
        this.logger.warn(
          `No client found for user_id: ${user_id} and charge_id: ${charge_id}`,
        );
        return;
      }

      await this.server
        .to(connection.socket_id)
        .emit('payment-status', { status, charge_id });

      this.logger.log(`Status sent to ${user_id}: ${status}`);
    } catch (error) {
      this.logger.error('Error in sendToUserWithCharge:', error);
    }
  }
}
