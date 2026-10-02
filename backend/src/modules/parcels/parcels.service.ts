import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcela } from '../../common/entities/parcela.entity';

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(Parcela)
    private parcelsRepository: Repository<Parcela>,
  ) {}

  findAll(): Promise<Parcela[]> {
    return this.parcelsRepository.find({ relations: ['cultivo'] });
  }

  findOne(id: string): Promise<Parcela | null> {
    return this.parcelsRepository.findOne({ where: { id }, relations: ['cultivo'] });
  }

  async create(parcelData: Partial<Parcela>): Promise<Parcela> {
    const parcel = this.parcelsRepository.create(parcelData);
    return this.parcelsRepository.save(parcel);
  }

  async update(id: string, parcelData: Partial<Parcela>): Promise<Parcela> {
    await this.parcelsRepository.update(id, parcelData);
    return this.findOne(id) as Promise<Parcela>;
  }

  async remove(id: string): Promise<void> {
    await this.parcelsRepository.delete(id);
  }
}
