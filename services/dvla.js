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

function buildDvlaSection(dvlaData, provided) {
  if (!dvlaData || dvlaData.error) {
    return `## 2) Identity & Production
- Registration: ${provided.registration || "Not provided"}
- VIN: ${provided.vin || "Not provided"}
- Make: ${provided.make || "Not provided"}
- Model: ${provided.model || "Not provided"}
- Year: ${provided.year || "Not provided"}

DVLA vehicle enquiry data was not available for this lookup, so this section is based only on the supplied vehicle details.`;
  }

  return `## 2) Identity & Production
- Registration: ${provided.registration || "Not provided"}
- VIN: ${provided.vin || "Not provided"}
- Make: ${dvlaData.make || provided.make || "Unknown"}
- Model: ${provided.model || "Not provided"}
- Year of manufacture: ${dvlaData.yearOfManufacture || provided.year || "Unknown"}
- Fuel type: ${dvlaData.fuelType || "Unknown"}
- Engine capacity: ${dvlaData.engineCapacity || "Unknown"} cc
- Colour: ${dvlaData.colour || "Unknown"}
- Tax status: ${dvlaData.taxStatus || "Unknown"}
- Tax due date: ${dvlaData.taxDueDate || "Unknown"}
- MOT status: ${dvlaData.motStatus || "Unknown"}
- Date of last V5C issued: ${dvlaData.dateOfLastV5CIssued || "Unknown"}
- Wheelplan: ${dvlaData.wheelplan || "Unknown"}
- Month of first registration: ${dvlaData.monthOfFirstRegistration || "Unknown"}`;
}

module.exports = { fetchDvlaData, buildDvlaSection };
