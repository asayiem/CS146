console.log("Running Parking App Security Tests...\n");

function validateFormData(formData){
  const spotId = formData.get('spotId').trim().toUpperCase();
  const garageLevel = formData.get('garageLevel');
  const eventType = formData.get('eventType');
  const alertNotes = formData.get('alertNotes').trim();

  const levelPrefix = {
    'Level 1': 'A',
    'Level 2': 'B',
    'Level 3': 'C',
    'Level 4': 'D',
    'Level 5': 'E'
  };

  if(!/^[A-E][0-9]{2}$/.test(spotId)){
    return "Invalid Spot ID";
  }

  if(!garageLevel){
    return "Missing garage level";
  }

  if(spotId.charAt(0) !== levelPrefix[garageLevel]){
    return "Spot does not match level";
  }

  const allowedTypes = ['vacated', 'occupied', 'leaving'];
  if(!eventType || !allowedTypes.includes(eventType)){
    return "Invalid event type";
  }

  if(alertNotes.length > 120){
    return "Notes too long";
  }

  return "VALID";
}

function createFakeForm(data){
  return {
    get: (key) => data[key] || ""
  };
}

let passed = 0;
let total = 0;

function runTest(name, data, expected){
  total++;
  const fakeForm = createFakeForm(data);
  const result = validateFormData(fakeForm);

  console.log(`Test: ${name}`);
  console.log(`Expected: ${expected}`);
  console.log(`Actual:   ${result}`);

  if(result === expected){
    console.log("✅ PASS\n");
    passed++;
  } else {
    console.log("❌ FAIL\n");
  }
}

runTest(
  "XSS attempt",
  {
    spotId: "<script>alert(1)</script>",
    garageLevel: "Level 1",
    eventType: "vacated",
    alertNotes: "test"
  },
  "Invalid Spot ID"
);

runTest(
  "Invalid spot format",
  {
    spotId: "Z99",
    garageLevel: "Level 2",
    eventType: "occupied",
    alertNotes: "test"
  },
  "Invalid Spot ID"
);

runTest(
  "Missing level",
  {
    spotId: "A03",
    garageLevel: "",
    eventType: "vacated",
    alertNotes: "test"
  },
  "Missing garage level"
);

runTest(
  "Too long notes",
  {
    spotId: "A03",
    garageLevel: "Level 1",
    eventType: "vacated",
    alertNotes: "A".repeat(150)
  },
  "Notes too long"
);

runTest(
  "Valid input",
  {
    spotId: "A03",
    garageLevel: "Level 1",
    eventType: "vacated",
    alertNotes: "All good"
  },
  "VALID"
);

// --- summary ---
console.log("------ SUMMARY ------");
console.log(`Passed: ${passed}/${total}`);
console.log("Security testing complete.");
