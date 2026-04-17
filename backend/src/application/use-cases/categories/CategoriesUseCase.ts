import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository'
import { Category, TransactionType } from '../../../domain/entities/Category'

export class CategoriesUseCase {
  constructor(private categoryRepository: ICategoryRepository) {}

  async list(userId: string, type?: TransactionType): Promise<Category[]> {
    return this.categoryRepository.findAllByUser(userId, type)
  }

  async create(userId: string, name: string, type: TransactionType, icon?: string, color?: string): Promise<Category> {
    return this.categoryRepository.create({ userId, name, type, icon, color })
  }

  async update(id: string, userId: string, data: { name?: string; type?: TransactionType; icon?: string; color?: string }): Promise<Category> {
    const existing = await this.categoryRepository.findById(id, userId)
    if (!existing) throw new Error('Category not found')
    return this.categoryRepository.update(id, userId, data)
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.categoryRepository.findById(id, userId)
    if (!existing) throw new Error('Category not found')
    return this.categoryRepository.delete(id, userId)
  }
}
