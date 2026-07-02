import { RegisterDto } from '../dto/register.dto';
import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { LoginDto } from '../dto/login.dto';
import { comparePassword } from '../utils/password';

export const authService = {
  register: async (
    payload: RegisterDto
  ) => {
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await userRepository.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: hashedPassword,
      role: 'employee',
      tenantId: 'company-1',
      profileCompleted: false,
      isActive: true,
    });

    const token = generateToken({
      userId: user._id,
      email: user.email,
    });

    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };


    return {
      user: userResponse,
      token,
    };
  },
  login: async (payload: LoginDto) => {
    const user =
      await userRepository.findByEmail(
        payload.email
      );

    if (!user) {
      throw new Error(
        'Invalid credentials'
      );
    }

    const isPasswordValid =
      await comparePassword(
        payload.password,
        user.password
      );

    if (!isPasswordValid) {
      throw new Error(
        'Invalid credentials'
      );
    }

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      token,
    };

  }
};