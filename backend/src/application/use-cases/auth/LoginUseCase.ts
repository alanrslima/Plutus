import { IUserRepository } from '../../../domain/repositories/IUserRepository'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

interface LoginInput {
  email: string
  password: string
}

interface LoginOutput {
  token: string
  user: { id: string; name: string; email: string }
}

export class LoginUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) throw new Error('Invalid credentials')

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw new Error('Invalid credentials')

    const secret = process.env.JWT_SECRET!
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d'
    const token = jwt.sign({ sub: user.id }, secret, { expiresIn } as jwt.SignOptions)

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    }
  }
}
