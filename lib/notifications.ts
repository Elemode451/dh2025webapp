const VONAGE_ENDPOINT = "https://rest.nexmo.com/sms/json";

type SendWaterAlertParams = {
  to: string;
  plantName: string;
  moisturePercent: number | null;
};

function getVonageConfig() {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = "Vonage APIs";

  if (!apiKey || !apiSecret || !from) {
    console.warn("Vonage credentials are not fully configured. SMS alerts are disabled.");
    return null;
  }

  return { apiKey, apiSecret, from };
}

export async function sendWaterAlert({ to, plantName, moisturePercent }: SendWaterAlertParams) {
  const config = getVonageConfig();

  if (!config) {
    return;
  }

  const messageParts = [`Hey! ${plantName} is feeling thirsty.`];

  if (typeof moisturePercent === "number" && !Number.isNaN(moisturePercent)) {
    messageParts.push(`Current moisture is around ${Math.round(moisturePercent)}%.`);
  }

  messageParts.push("Could you give them a drink?");

  const params = new URLSearchParams({
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    to,
    from: config.from,
    text: messageParts.join(" "),
  });

  try {
    const response = await fetch(VONAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Failed to send Vonage SMS", response.status, body);
    }
  } catch (error) {
    console.error("Unexpected error when sending Vonage SMS", error);
  }
}
