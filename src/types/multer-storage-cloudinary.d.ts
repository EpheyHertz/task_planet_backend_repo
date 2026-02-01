declare module 'multer-storage-cloudinary' {
  import { StorageEngine } from 'multer';
  import { v2 as cloudinary } from 'cloudinary';

  interface Options {
    cloudinary: typeof cloudinary;
    params?: {
      folder?: string;
      format?: (req: any, file: any) => string | Promise<string>;
      public_id?: (req: any, file: any) => string;
      allowed_formats?: string[];
      transformation?: Array<{
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
      }>;
      [key: string]: any;
    };
  }

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: Options);
    _handleFile(req: any, file: any, cb: (error?: any, info?: any) => void): void;
    _removeFile(req: any, file: any, cb: (error: Error | null) => void): void;
  }
}
