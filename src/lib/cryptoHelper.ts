import { createHash } from 'crypto';

export function hashifyContent(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}