import { mapEpcRecordToModeA } from '../src/services/epcService';

async function runTest() {
  const certNumbers = ['3103-3736-9002-0101-7802', '2090-5311-3060-8708-1705', '9922-1202-1105-1765-0600'];
  for (const certNo of certNumbers) {
    console.log('\n--- TESTING CERT:', certNo);
    const data = await mapEpcRecordToModeA({
      lmkKey: certNo,
      certificateNumber: certNo,
      address: 'Test Property',
      postcode: 'M20 2WW',
      epcRating: 'C',
      certificateDate: '2026-09-15',
      propertyType: 'Flat',
      builtForm: 'Flat',
      floorAreaSqM: 32,
      rawRecord: {}
    });
    console.log(JSON.stringify(data, null, 2));
  }
}

runTest();
