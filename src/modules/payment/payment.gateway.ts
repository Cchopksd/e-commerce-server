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

  // ================== Socket Events ==================
  // Register a user to receive payment status updates
  // @Desc Client opens a socket connection
  // @Next ==> If the user scans the QR code successfully,
  //            the payment status will be returned to the user
  // ===================================================
  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { user_id: string; charge_id: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client?.id) {
        this.logger.error('Client ID is missing');
        client.emit('error', { message: 'Invalid client connection' });
        return;
      }

      const { user_id, charge_id } = data || {};
      if (!user_id || !charge_id) {
        this.logger.warn('Invalid registration data received', data);
        client.emit('error', { message: 'Invalid registration data' });
        return;
      }

      const key = `${user_id}:${charge_id}`;

      // Store the connection details
      this.connections.set(key, {
        socket_id: client.id,
        charge_id,
        lastActive: Date.now(),
      });

      this.logger.log(
        `User registered - user_id: ${user_id}, charge_id: ${charge_id}`,
      );

      // Optionally confirm registration to the client
      client.emit('registration-success', { user_id, charge_id });

      // Send initial empty status or confirmation
      await this.sendToUserWithCharge(user_id, charge_id, '');
    } catch (error) {
      this.logger.error('Error in handleRegister:', error.message || error);
      client.emit('error', { message: 'Registration failed' });
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
          `No active connection found for user_id: ${user_id}, charge_id: ${charge_id}`,
        );
        return;
      }

      // Emit the payment status update to the connected client
      this.server
        .to(connection.socket_id)
        .emit('payment-status', { status, charge_id });

      this.logger.log(
        `Payment status sent to user_id: ${user_id}, status: ${status}`,
      );
    } catch (error) {
      this.logger.error(
        'Error in sendToUserWithCharge:',
        error.message || error,
      );
    }
  }
}
