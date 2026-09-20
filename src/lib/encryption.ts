import crypto from 'crypto';

// A 32-byte key is required for aes-256-gcm. We derive it from JWT_SECRET or another secure env var.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.scryptSync(process.env.JWT_SECRET || 'fallback', 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

export function encryptData(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptData(encryptedString: string): string {
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) return encryptedString; // Not encrypted or wrong format
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedString; // Return original if decryption fails (e.g. data wasn't actually encrypted)
  }
}
