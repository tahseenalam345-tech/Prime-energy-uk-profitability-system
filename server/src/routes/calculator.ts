import { Router, Request, Response } from 'express';
import { calculateNewLeadEstimate } from '../engine/newLeadCalculator.js';
import { calculateAfterSurveyViability } from '../engine/afterSurveyCalculator.js';

export const calculatorRouter = Router();

// Mode A - New Lead Pre-Survey Calculator
calculatorRouter.post('/new-lead', async (req: Request, res: Response) => {
  try {
    const inputs = { ...req.body };
    // Graceful fallbacks so no field is compulsory
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
    console.error('Error in New Lead calculator:', error);
    res.status(500).json({ error: error.message || 'Calculation engine failure' });
  }
});

// Mode B - After Survey Viability Calculator
calculatorRouter.post('/after-survey', async (req: Request, res: Response) => {
  try {
    const inputs = { ...req.body };
    // Graceful fallbacks so no field is compulsory
    if (!inputs.confirmedDesignHeatLossKw || Number(inputs.confirmedDesignHeatLossKw) <= 0) {
      inputs.confirmedDesignHeatLossKw = 6.0;
    }
    if (!inputs.selectedAshpId) {
      inputs.selectedAshpId = 'ashp_ecogenica_9';
    }

    const result = await calculateAfterSurveyViability(inputs);
    res.json(result);
  } catch (error: any) {
    console.error('Error in After Survey calculator:', error);
    res.status(500).json({ error: error.message || 'Survey calculation engine failure' });
  }
});
