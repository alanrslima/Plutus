import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import { AppError } from '../../errors/AppError'
import bcrypt from 'bcryptjs'

interface UpdatePasswordInput {
  userId: string
  currentPassword: string
  newPassword: string
}

export class UpdatePasswordUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute({ userId, currentPassword, newPassword }: UpdatePasswordInput): Promise<void> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new AppError('User not found', 404)

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) throw new AppError('Current password is incorrect', 422)

    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    await this.userRepository.updatePassword(userId, newPasswordHash)
  }
}
