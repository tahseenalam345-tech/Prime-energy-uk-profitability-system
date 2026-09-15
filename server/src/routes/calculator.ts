import { Router, Response } from 'express';
import { calculateNewLeadEstimate } from '../engine/newLeadCalculator.js';
import { calculateAfterSurveyViability } from '../engine/afterSurveyCalculator.js';
import { optionalAuthenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

export const calculatorRouter = Router();

function safeErrorResponse(res: Response, err: any, defaultMsg: string) {
  console.error(`[Calculator Error]:`, err);
  const msg = process.env.NODE_ENV === 'production' ? defaultMsg : (err.message || defaultMsg);
  res.status(500).json({ error: msg });
}

// Mode A - New Lead Pre-Survey Calculator (Ephemeral calculation, unauthenticated allowed)
calculatorRouter.post('/new-lead', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const inputs = { ...req.body };
    if (!inputs.epcFloorArea || Number(inputs.epcFloorArea) <= 0) {
      inputs.epcFloorArea = 100;
    }
    if (!inputs.propertyType) {
      inputs.propertyType = 'Semi detached';
    }
    if (!inputs.country) {
      inputs.country = 'England';
    }
    if (!inputs.propertyStatus) {
      inputs.propertyStatus = 'Existing property';
    }

    const result = await calculateNewLeadEstimate(inputs);
    res.json(result);
  } catch (error: any) {
    safeErrorResponse(res, error, 'Calculation engine failure');
  }
});

// Mode B - After Survey Viability Calculator (Ephemeral calculation, unauthenticated allowed)
calculatorRouter.post('/after-survey', optionalAuthenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const inputs = { ...req.body };
    if (!inputs.confirmedDesignHeatLossKw || Number(inputs.confirmedDesignHeatLossKw) <= 0) {
      inputs.confirmedDesignHeatLossKw = 6.0;
    }
    if (!inputs.selectedAshpId) {
      inputs.selectedAshpId = 'ashp_ecogenica_9';
    }

    const result = await calculateAfterSurveyViability(inputs);
    res.json(result);
  } catch (error: any) {
    safeErrorResponse(res, error, 'Survey calculation engine failure');
  }
});

