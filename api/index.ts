import app from '../server/src/index.js';
import { bootstrapInitialAdmin } from '../server/src/db/bootstrapAdmin.js';

let isBootstrapped = false;

export default async function handler(req: any, res: any) {
  if (!isBootstrapped) {
    try {
      await bootstrapInitialAdmin();
      isBootstrapped = true;
    } catch (err) {
      console.error('[Vercel Bootstrap Error]:', err);
    }
  }
  return app(req, res);
}
