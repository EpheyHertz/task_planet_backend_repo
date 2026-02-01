import { Request } from 'express';

// User interface
export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Comment interface
export interface IComment {
  _id?: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
}

// Post interface
export interface IPost {
  _id: string;
  author: string;
  authorUsername: string;
  authorProfilePicture?: string;
  content?: string;
  image?: string;
  likes: {
    count: number;
    users: string[]; // array of usernames
  };
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

// Extended Request with user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}
