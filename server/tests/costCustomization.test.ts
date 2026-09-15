import { describe, it, expect } from 'vitest';
import { calculateNewLeadEstimate } from '../src/engine/newLeadCalculator.js';
import { calculateAfterSurveyViability } from '../src/engine/afterSurveyCalculator.js';

describe('Manual Cost Customization, Editing, Line Deletion & Custom Lines', () => {
  describe('Mode A — New Lead Calculator', () => {
    it('allows editing any cost field using category or line ID', async () => {
      const baseline = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 120,
        propertyType: 'Detached'
      });

      const overridden = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 120,
        propertyType: 'Detached',
        costOverrides: {
          line_ashp: 5000,
          'Installation Labour': 2500
        }
      });

      expect(overridden.costBreakdown.ashpCost).toBe(5000);
      expect(overridden.costBreakdown.labour).toBe(2500);

      const ashpLine = overridden.lineItems.find(l => l.id === 'line_ashp');
      expect(ashpLine?.totalPriceExVat).toBe(5000);
      expect(ashpLine?.isOverridden).toBe(true);

      const labourLine = overridden.lineItems.find(l => l.id === 'line_labour');
      expect(labourLine?.totalPriceExVat).toBe(2500);
      expect(labourLine?.isOverridden).toBe(true);
    });

    it('allows deleting any standard line item, setting cost to 0 and marking it deleted', async () => {
      const baseline = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 100,
        propertyType: 'Semi detached'
      });

      const withDeleted = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 100,
        propertyType: 'Semi detached',
        deletedLineIds: ['line_contingency', 'line_leadgen']
      });

      expect(withDeleted.costBreakdown.extrasContingency).toBe(0);
      expect(withDeleted.costBreakdown.leadGeneration).toBe(0);
      expect(withDeleted.costBreakdown.totalJobCost).toBeLessThan(baseline.costBreakdown.totalJobCost);

      const contLine = withDeleted.lineItems.find(l => l.id === 'line_contingency');
      expect(contLine?.isDeleted).toBe(true);
      expect(contLine?.totalPriceExVat).toBe(0);

      const leadGenLine = withDeleted.lineItems.find(l => l.id === 'line_leadgen');
      expect(leadGenLine?.isDeleted).toBe(true);
      expect(leadGenLine?.totalPriceExVat).toBe(0);
    });

    it('allows overriding line item descriptions', async () => {
      const result = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 100,
        propertyType: 'Semi detached',
        descriptionOverrides: {
          line_labour: 'Specialist 3-Man Team Installation Labour (4 Days)',
          line_pipework: 'Custom Pre-Insulated Twin Ducting Run'
        }
      });

      const labourLine = result.lineItems.find(l => l.id === 'line_labour');
      expect(labourLine?.description).toBe('Specialist 3-Man Team Installation Labour (4 Days)');

      const pipeLine = result.lineItems.find(l => l.id === 'line_pipework');
      expect(pipeLine?.description).toBe('Custom Pre-Insulated Twin Ducting Run');
    });

    it('allows adding and calculating custom line items', async () => {
      const baseline = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 100,
        propertyType: 'Semi detached'
      });

      const withCustom = await calculateNewLeadEstimate({
        addressLine1: '10 High St',
        postcode: 'SW1A 1AA',
        epcFloorArea: 100,
        propertyType: 'Semi detached',
        customLineItems: [
          {
            id: 'custom_1',
            category: 'Access Works',
            description: 'Scaffolding for 2 storeys',
            quantity: 1,
            unitPriceExVat: 650,
            totalPriceExVat: 650
          },
          {
            id: 'custom_2',
            category: 'Groundworks',
            description: 'Trenching across driveway (10m)',
            quantity: 10,
            unitPriceExVat: 45,
            totalPriceExVat: 450
          }
        ]
      });

      expect(withCustom.costBreakdown.customCostsTotal).toBe(1100);
      expect(withCustom.costBreakdown.totalJobCost).toBe(baseline.costBreakdown.totalJobCost + 1100);

      const customLine1 = withCustom.lineItems.find(l => l.id === 'custom_1');
      expect(customLine1).toBeDefined();
      expect(customLine1?.totalPriceExVat).toBe(650);
      expect(customLine1?.isCustom).toBe(true);

      const customLine2 = withCustom.lineItems.find(l => l.id === 'custom_2');
      expect(customLine2).toBeDefined();
      expect(customLine2?.totalPriceExVat).toBe(450);
      expect(customLine2?.quantity).toBe(10);
    });
  });

  describe('Mode B — After Survey Calculator', () => {
    it('allows editing any cost field using category or line ID', async () => {
      const baseline = await calculateAfterSurveyViability({
        leadId: 'test_lead',
        surveyorUserId: 'surveyor_1',
        confirmedDesignHeatLossKw: 7.5,
        designOutdoorTemp: -2,
        designFlowTemp: 45,
        selectedAshpId: 'ashp_ecogenica_9',
        exactRadiatorsSchedule: []
      });

      const overridden = await calculateAfterSurveyViability({
        leadId: 'test_lead',
        surveyorUserId: 'surveyor_1',
        confirmedDesignHeatLossKw: 7.5,
        designOutdoorTemp: -2,
        designFlowTemp: 45,
        selectedAshpId: 'ashp_ecogenica_9',
        exactRadiatorsSchedule: [],
        costOverrides: {
          line_ashp: 4200,
          line_elec: 550,
          Labour: 2100
        }
      });

      expect(overridden.costBreakdown.ashpCost).toBe(4200);
      expect(overridden.costBreakdown.electricalWorksCost).toBe(550);
      expect(overridden.costBreakdown.labour).toBe(2100);

      const ashpLine = overridden.lineItems.find(l => l.id === 'line_ashp');
      expect(ashpLine?.totalPriceExVat).toBe(4200);

      const elecLine = overridden.lineItems.find(l => l.id === 'line_elec');
      expect(elecLine?.totalPriceExVat).toBe(550);

      const labourLine = overridden.lineItems.find(l => l.id === 'line_labour');
      expect(labourLine?.totalPriceExVat).toBe(2100);
    });

    it('allows deleting any line item in After Survey mode', async () => {
      const baseline = await calculateAfterSurveyViability({
        leadId: 'test_lead',
        surveyorUserId: 'surveyor_1',
        confirmedDesignHeatLossKw: 7.5,
        designOutdoorTemp: -2,
        designFlowTemp: 45,
        selectedAshpId: 'ashp_ecogenica_9',
        exactRadiatorsSchedule: []
      });

      const withDeleted = await calculateAfterSurveyViability({
        leadId: 'test_lead',
        surveyorUserId: 'surveyor_1',
        confirmedDesignHeatLossKw: 7.5,
        designOutdoorTemp: -2,
        designFlowTemp: 45,
        selectedAshpId: 'ashp_ecogenica_9',
        exactRadiatorsSchedule: [],
        deletedLineIds: ['line_leadgen', 'line_contingency']
      });

      expect(withDeleted.costBreakdown.leadGeneration).toBe(0);
      expect(withDeleted.costBreakdown.extrasContingency).toBe(0);
      expect(withDeleted.costBreakdown.totalJobCost).toBeLessThan(baseline.costBreakdown.totalJobCost);

      const leadGen = withDeleted.lineItems.find(l => l.id === 'line_leadgen');
      expect(leadGen?.isDeleted).toBe(true);
      expect(leadGen?.totalPriceExVat).toBe(0);
    });

    it('allows adding custom lines in After Survey mode', async () => {
      const baseline = await calculateAfterSurveyViability({
        leadId: 'test_lead',
        surveyorUserId: 'surveyor_1',
        confirmedDesignHeatLossKw: 7.5,
        designOutdoorTemp: -2,
        designFlowTemp: 45,
        selectedAshpId: 'ashp_ecogenica_9',
        exactRadiatorsSchedule: []
      });

      const withCustom = await calculateAfterSurveyViability({
        leadId: 'test_lead',
        surveyorUserId: 'surveyor_1',
        confirmedDesignHeatLossKw: 7.5,
        designOutdoorTemp: -2,
        designFlowTemp: 45,
        selectedAshpId: 'ashp_ecogenica_9',
        exactRadiatorsSchedule: [],
        customLineItems: [
          {
            id: 'custom_survey_1',
            category: 'Builder Works',
            description: 'Core drilling 150mm through solid stone wall',
            quantity: 1,
            unitPriceExVat: 380,
            totalPriceExVat: 380
          }
        ]
      });

      expect(withCustom.costBreakdown.customCostsTotal).toBe(380);
      expect(withCustom.costBreakdown.totalJobCost).toBe(baseline.costBreakdown.totalJobCost + 380);

      const customItem = withCustom.lineItems.find(l => l.id === 'custom_survey_1');
      expect(customItem).toBeDefined();
      expect(customItem?.totalPriceExVat).toBe(380);
      expect(customItem?.isCustom).toBe(true);
    });
  });
});
