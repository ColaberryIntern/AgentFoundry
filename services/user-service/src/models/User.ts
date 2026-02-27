import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type UserRole = 'c_suite' | 'compliance_officer' | 'it_admin';

export interface UserAttributes {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  verificationToken: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<
  UserAttributes,
  'id' | 'isVerified' | 'verificationToken' | 'createdAt' | 'updatedAt'
> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare isVerified: boolean;
  declare verificationToken: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Returns a safe representation of the user, excluding
   * sensitive fields (passwordHash, verificationToken).
   */
  toSafeJSON(): Omit<UserAttributes, 'passwordHash' | 'verificationToken'> {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('c_suite', 'compliance_officer', 'it_admin'),
      allowNull: false,
      defaultValue: 'compliance_officer',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified',
    },
    verificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'verification_token',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['email'], unique: true }],
  },
);

export { User };
