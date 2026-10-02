import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cultivo } from '../../common/entities/cultivo.entity';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(Cultivo)
    private cropsRepository: Repository<Cultivo>,
  ) {}

  findAll(): Promise<Cultivo[]> {
    return this.cropsRepository.find();
  }

  findOne(id: string): Promise<Cultivo | null> {
    return this.cropsRepository.findOneBy({ id });
  }

  async create(cropData: Partial<Cultivo>): Promise<Cultivo> {
    const crop = this.cropsRepository.create(cropData);
    return this.cropsRepository.save(crop);
  }

  async update(id: string, cropData: Partial<Cultivo>): Promise<Cultivo> {
    await this.cropsRepository.update(id, cropData);
    return this.findOne(id) as Promise<Cultivo>;
  }

  async remove(id: string): Promise<void> {
    await this.cropsRepository.delete(id);
  }
}
