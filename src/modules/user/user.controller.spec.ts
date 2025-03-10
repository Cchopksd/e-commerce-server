import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';

import { HttpStatus } from '@nestjs/common';
import { UserRole } from './schemas/user.schema';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn().mockResolvedValue(['user1', 'user2']),
            findOne: jest
              .fn()
              .mockResolvedValue({ id: '1', email: 'test@example.com' }),
            findUserDetail: jest
              .fn()
              .mockResolvedValue({ id: '1', name: 'John Doe' }),
            findByEmail: jest
              .fn()
              .mockResolvedValue({ id: '1', email: 'test@example.com' }),
            update: jest
              .fn()
              .mockResolvedValue({ id: '1', name: 'Updated User' }),
            updatePassword: jest
              .fn()
              .mockResolvedValue({ message: 'Password updated' }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return success message', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: '123456',
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        age: 0,
        role: UserRole.ADMIN,
      };
      await expect(userController.create(createUserDto)).resolves.toEqual({
        message: 'User created successfully',
        statusCode: HttpStatus.CREATED,
      });
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await userController.findAll();
      await expect(result).toEqual(['user1', 'user2']);

      expect(userService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user by ID', async () => {
      await expect(userController.findOne('1')).resolves.toEqual({
        id: '1',
        email: 'test@example.com',
      });
      expect(userService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      await expect(
        userController.findByEmail('test@example.com'),
      ).resolves.toEqual({ id: '1', email: 'test@example.com' });
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updatedUsername',
        first_name: 'UpdatedFirstName',
        last_name: 'UpdatedLastName',
        phone: '1234567890',
        age: 30,
      };
      await expect(
        userController.update('1', updateUserDto, {}),
      ).resolves.toEqual({ id: '1', name: 'Updated User' });
      expect(userService.update).toHaveBeenCalledWith('1', updateUserDto, {});
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const updateUserPasswordDto: UpdateUserPasswordDto = {
        old_password: 'oldpassword123',
        new_password: 'newpassword456',
      };

      await expect(
        userController.updatePassword('1', updateUserPasswordDto),
      ).resolves.toEqual({ message: 'Password updated' });
      expect(userService.updatePassword).toHaveBeenCalledWith(
        '1',
        updateUserPasswordDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      await expect(userController.remove('1')).resolves.toEqual({
        message: 'User removed successfully',
        statusCode: HttpStatus.OK,
      });
      expect(userService.remove).toHaveBeenCalledWith('1');
    });
  });
});
