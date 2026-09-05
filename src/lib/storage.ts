import fs from 'fs';
import path from 'path';

export interface StorageResult {
  fileUrl: string;
  fileSize: number;
}

export interface StorageProvider {
  uploadFile(fileBuffer: Buffer, originalFileName: string): Promise<StorageResult>;
  deleteFile(fileUrl: string): Promise<boolean>;
}

/**
 * Validates actual binary content magic bytes (signatures)
 * to ensure uploaded files are genuine PDF, JPEG, or PNG files,
 * avoiding reliance on client-supplied extensions.
 */
export function validateFileMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string; error?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File buffer too small or empty' };
  }

  // 1. PDF Signature: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // 2. PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 3. JPEG / JPG Signature: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  return {
    valid: false,
    error: 'Invalid file signature (magic bytes). File must be a genuine PDF, PNG, or JPEG document.',
  };
}

// Local Disk Storage Implementation (for local dev & SQLite setup)
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer, originalFileName: string): Promise<StorageResult> {
    const ext = path.extname(originalFileName) || '.bin';
    const sanitizedBase = path.basename(originalFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${Date.now()}_${sanitizedBase}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueName);

    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      fileUrl: `/uploads/${uniqueName}`,
      fileSize: fileBuffer.length,
    };
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Storage Facade Factory
export function getStorageProvider(): StorageProvider {
  // Swappable provider switch based on env (e.g. process.env.STORAGE_PROVIDER === 'supabase')
  return new LocalStorageProvider();
}
