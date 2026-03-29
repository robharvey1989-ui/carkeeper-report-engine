const axios = require("axios");

async function fetchDvlaData(registration, forwardedApiKey = "") {
  const DVLA_API_KEY = forwardedApiKey || process.env.DVLA_API_KEY || "";

  if (!registration || !DVLA_API_KEY) {
    return {
      error: "DVLA data unavailable",
      debug: {
        hasRegistration: !!registration,
        hasApiKey: !!DVLA_API_KEY
      }
    };
  }

  try {
    const response = await axios.post(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      { registrationNumber: registration },
      {
        headers: {
          "x-api-key": DVLA_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    return response.data;
  } catch (error) {
    console.error("DVLA lookup failed:", {
      message: error.message,
      status: error.response?.status || null,
      data: error.response?.data || null
    });

    return {
      error: "DVLA data unavailable",
      debug: {
        status: error.response?.status || null,
        data: error.response?.data || null,
        message: error.message
      }
    };
  }
}

function clean(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value).trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function sameLoose(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function buildIdentityChecks(dvlaData, provided) {
  const notes = [];

  const providedMake = clean(provided.make);
  const providedYear = clean(provided.year);
  const dvlaMake = clean(dvlaData.make);
  const dvlaYear = clean(dvlaData.yearOfManufacture);

  if (provided.registration && dvlaData.registrationNumber) {
    if (upper(provided.registration) === upper(dvlaData.registrationNumber)) {
      notes.push("- Registration match: confirmed between supplied registration and DVLA response.");
    } else {
      notes.push("- Registration match: the DVLA response does not clearly match the supplied registration, which should be checked carefully.");
    }
  }

  if (providedMake !== "Unknown" && dvlaMake !== "Unknown") {
    if (sameLoose(providedMake, dvlaMake)) {
      notes.push("- Make match: the supplied make is consistent with DVLA data.");
    } else {
      notes.push(`- Make mismatch risk: supplied make "${providedMake}" differs from DVLA make "${dvlaMake}".`);
    }
  } else if (dvlaMake !== "Unknown") {
    notes.push("- Make confidence: DVLA provides a make, which is stronger than user-supplied identification alone.");
  }

  if (providedYear !== "Unknown" && dvlaYear !== "Unknown") {
    if (String(providedYear) === String(dvlaYear)) {
      notes.push("- Year match: the supplied year is consistent with DVLA year of manufacture.");
    } else {
      notes.push(`- Year mismatch risk: supplied year "${providedYear}" differs from DVLA year of manufacture "${dvlaYear}".`);
    }
  }

  if (provided.vin && clean(provided.vin) !== "Unknown") {
    notes.push("- VIN: a VIN was supplied by the user, but DVLA vehicle enquiry does not validate VIN directly in this response.");
  } else {
    notes.push("- VIN: no VIN-level confirmation is available from this DVLA enquiry response.");
  }

  if (clean(dvlaData.dateOfLastV5CIssued) !== "Unknown") {
    notes.push("- V5C signal: the last V5C issue date can be useful context and may justify asking why a replacement or updated V5C was issued if recent.");
  }

  if (clean(dvlaData.monthOfFirstRegistration) !== "Unknown" && clean(dvlaData.yearOfManufacture) !== "Unknown") {
    notes.push("- Registration timing: compare first registration timing with the claimed age/specification to ensure the story makes sense.");
  }

  return notes.length ? notes.join("\n") : "- No additional identity checks could be derived.";
}

function buildAdministrativeSignals(dvlaData) {
  const notes = [];

  const taxStatus = clean(dvlaData.taxStatus);
  const taxDueDate = clean(dvlaData.taxDueDate);
  const motStatus = clean(dvlaData.motStatus);
  const v5cDate = clean(dvlaData.dateOfLastV5CIssued);

  if (taxStatus !== "Unknown") {
    notes.push(`- Tax status: ${taxStatus}.`);
  }

  if (taxDueDate !== "Unknown") {
    notes.push(`- Tax due date: ${taxDueDate}.`);
  }

  if (motStatus !== "Unknown") {
    notes.push(`- MOT status from DVLA: ${motStatus}.`);
  }

  if (v5cDate !== "Unknown") {
    notes.push(`- Date of last V5C issued: ${v5cDate}. A recent V5C issue is not automatically negative, but it is worth understanding why it was reissued.`);
  }

  const colour = clean(dvlaData.colour);
  if (colour !== "Unknown") {
    notes.push(`- DVLA recorded colour: ${colour}. This should broadly match the vehicle as seen in person and in photos.`);
  }

  return notes.length ? notes.join("\n") : "- No additional administrative signals were available.";
}

function buildSpecContext(dvlaData) {
  const notes = [];

  const fuel = clean(dvlaData.fuelType);
  const engineCapacity = clean(dvlaData.engineCapacity);
  const wheelplan = clean(dvlaData.wheelplan);
  const euroStatus = clean(dvlaData.euroStatus);
  const co2 = clean(dvlaData.co2Emissions);

  if (fuel !== "Unknown") notes.push(`- Fuel type: ${fuel}.`);
  if (engineCapacity !== "Unknown") notes.push(`- Engine capacity recorded by DVLA: ${engineCapacity} cc.`);
  if (wheelplan !== "Unknown") notes.push(`- Wheelplan: ${wheelplan}.`);
  if (euroStatus !== "Unknown") notes.push(`- Emissions classification: ${euroStatus}.`);
  if (co2 !== "Unknown") notes.push(`- CO2 figure recorded: ${co2}.`);

  if (fuel !== "Unknown" || engineCapacity !== "Unknown" || wheelplan !== "Unknown") {
    notes.push("- Specification note: DVLA data is useful for broad identity and classification, but it should not be treated as full trim/spec confirmation.");
  }

  return notes.length ? notes.join("\n") : "- No useful specification context was available from DVLA.";
}

function buildDvlaSection(dvlaData, provided) {
  const suppliedRegistration = clean(provided.registration);
  const suppliedVin = clean(provided.vin);
  const suppliedMake = clean(provided.make);
  const suppliedModel = clean(provided.model);
  const suppliedYear = clean(provided.year);

  if (!dvlaData || dvlaData.error) {
    return `## 2) Identity & Production
### Verified / Confirmed
- Registration supplied by user: ${suppliedRegistration}
- VIN supplied by user: ${suppliedVin}
- Make supplied by user: ${suppliedMake}
- Model supplied by user: ${suppliedModel}
- Year supplied by user: ${suppliedYear}

### DVLA Evidence Status
- DVLA vehicle enquiry data was not available for this lookup.

### Identity Interpretation
- This section is based only on the supplied vehicle details.
- Without DVLA confirmation, identity confidence is weaker and key details remain externally unverified.
- The registration, VIN, make, model, and year should all be checked carefully against the vehicle and its documents in person.

### Limitations
- No DVLA-backed confirmation of make, year, tax status, MOT status, colour, or V5C issue timing was available in this lookup.`;
  }

  const registrationNumber = clean(dvlaData.registrationNumber || provided.registration);
  const make = clean(dvlaData.make || provided.make);
  const model = clean(provided.model);
  const yearOfManufacture = clean(dvlaData.yearOfManufacture || provided.year);
  const monthOfFirstRegistration = clean(dvlaData.monthOfFirstRegistration);
  const fuelType = clean(dvlaData.fuelType);
  const engineCapacity = clean(dvlaData.engineCapacity);
  const colour = clean(dvlaData.colour);
  const taxStatus = clean(dvlaData.taxStatus);
  const taxDueDate = clean(dvlaData.taxDueDate);
  const motStatus = clean(dvlaData.motStatus);
  const dateOfLastV5CIssued = clean(dvlaData.dateOfLastV5CIssued);
  const wheelplan = clean(dvlaData.wheelplan);
  const revenueWeight = clean(dvlaData.revenueWeight);
  const euroStatus = clean(dvlaData.euroStatus);
  const co2Emissions = clean(dvlaData.co2Emissions);

  return `## 2) Identity & Production
### Verified / Confirmed
- Registration: ${registrationNumber}
- VIN supplied by user: ${suppliedVin}
- Make: ${make}
- Model supplied by user: ${model}
- Year of manufacture: ${yearOfManufacture}
- Month of first registration: ${monthOfFirstRegistration}
- Fuel type: ${fuelType}
- Engine capacity: ${engineCapacity !== "Unknown" ? `${engineCapacity} cc` : "Unknown"}
- Colour: ${colour}
- Tax status: ${taxStatus}
- Tax due date: ${taxDueDate}
- MOT status: ${motStatus}
- Date of last V5C issued: ${dateOfLastV5CIssued}
- Wheelplan: ${wheelplan}
- Revenue weight: ${revenueWeight}
- Euro status: ${euroStatus}
- CO2 emissions: ${co2Emissions}

### Identity Checks & Match Strength
${buildIdentityChecks(dvlaData, provided)}

### Administrative & Paperwork Signals
${buildAdministrativeSignals(dvlaData)}

### Build / Specification Context
${buildSpecContext(dvlaData)}

### Limitations
- DVLA vehicle enquiry data is useful for identity, taxation, MOT status, and broad classification.
- It does not by itself confirm ownership history, accident history, finance status, service history, or exact trim/specification.`;
}

module.exports = { fetchDvlaData, buildDvlaSection };
