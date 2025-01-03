import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.client = new Redis({ host: 'localhost', port: 6379, db: 0 });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    this.client.on('close', () => {
      this.logger.log('Redis client connection closed');
    });
  }
  async getTreadingProductValue(key: string): Promise<any> {
    const product = await this.client.get(`product:${key}`);
    if (product) {
      this.logger.log(`Product found in cache: ${key}`);
      return JSON.parse(product);
    } else {
      this.logger.log(`Product not found in cache: ${key}`);
      return null;
    }
  }

  async setTreadingProductValue(key: string, value: any): Promise<void> {
    await this.client.set(`product:${key}`, JSON.stringify(value), 'EX', 3060);
    this.logger.log(`Product cached: ${key}`);
  }
}
