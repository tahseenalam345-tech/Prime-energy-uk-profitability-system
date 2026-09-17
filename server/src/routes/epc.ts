import { Router, Response } from 'express';
import { optionalAuthenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { searchEpcByPostcode, mapEpcRecordToModeA, EpcPropertySearchResult } from '../services/epcService.js';

export const epcRouter = Router();

// GET /api/epc/search?postcode=...
epcRouter.get('/search', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const postcode = String(req.query.postcode || '').trim();
    if (!postcode || postcode.length < 3) {
      return res.status(400).json({
        error: 'A valid UK postcode parameter is required (e.g. WA15 8XL).'
      });
    }

    const data = await searchEpcByPostcode(postcode);
    res.json(data);
  } catch (err: any) {
    console.error('[EPC Router Error]:', err);
    res.status(500).json({ error: 'Failed to search GOV.UK EPC database.' });
  }
});

// POST /api/epc/map — Map selected EPC record to Mode A fields
epcRouter.post('/map', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const record: EpcPropertySearchResult = req.body.record;
    if (!record || !record.lmkKey) {
      return res.status(400).json({ error: 'A valid EPC property record is required.' });
    }

    const mappedData = await mapEpcRecordToModeA(record);
    res.json({
      success: true,
      mappedData
    });
  } catch (err: any) {
    console.error('[EPC Router Map Error]:', err);
    res.status(500).json({ error: 'Failed to map EPC record to Mode A fields.' });
  }
});
