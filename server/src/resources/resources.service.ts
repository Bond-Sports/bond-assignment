import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Resource } from 'src/entities/resource.entity';

@Injectable()
export class ResourcesService {
  constructor(private readonly manager: EntityManager) {}

  async getResources(): Promise<Resource[]> {
    return await this.manager.find(Resource);
  }
}
