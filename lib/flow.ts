import crypto from "crypto";
import querystring from "querystring";

type FlowCreatePaymentParams = {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
};

type FlowCreatePaymentResponse = {
  url: string;
  token: string;
  flowOrder?: number;
};

type FlowStatusResponse = {
  flowOrder: number;
  commerceOrder: string;
  requestDate: string;
  status: number;
  subject: string;
  currency: string;
  amount: number;
  payer?: string;
};

function getFlowConfig() {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  const apiUrl = process.env.FLOW_API_URL || "https://sandbox.flow.cl/api";

  if (!apiKey || !secretKey) {
	throw new Error("Faltan FLOW_API_KEY o FLOW_SECRET_KEY");
  }

  return { apiKey, secretKey, apiUrl };
}

function signParams(params: Record<string, string | number>) {
  const { secretKey } = getFlowConfig();
  const keys = Object.keys(params).sort();

  let toSign = "";
  for (const key of keys) {
	toSign += key + params[key];
  }

  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

export async function createFlowPayment(
  params: FlowCreatePaymentParams
): Promise<FlowCreatePaymentResponse> {
  const { apiKey, apiUrl } = getFlowConfig();

  const flowParams = {
	apiKey,
	commerceOrder: params.commerceOrder,
	subject: params.subject,
	currency: "CLP",
	amount: Math.round(params.amount),
	email: params.email,
	urlConfirmation: params.urlConfirmation,
	urlReturn: params.urlReturn,
  };

  const signature = signParams(flowParams);
  const body = querystring.stringify({
	...flowParams,
	s: signature,
  });

  const res = await fetch(apiUrl + "/payment/create", {
	method: "POST",
	headers: {
  	"Content-Type": "application/x-www-form-urlencoded",
	},
	body,
  });

  const data = await res.json();

  if (!res.ok) {
	console.error("[FLOW CREATE ERROR]", data);
	throw new Error(data?.message || "No se pudo crear pago en Flow");
  }

  return data;
}

export async function getFlowPaymentStatus(
  token: string
): Promise<FlowStatusResponse> {
  const { apiKey, apiUrl } = getFlowConfig();

  const params = {
	apiKey,
	token,
  };

  const signature = signParams(params);

  const query = querystring.stringify({
	...params,
	s: signature,
  });

  const res = await fetch(apiUrl + "/payment/getStatus?" + query, {
	method: "GET",
  });

  const data = await res.json();

  if (!res.ok) {
	console.error("[FLOW STATUS ERROR]", data);
	throw new Error(data?.message || "No se pudo consultar estado Flow");
  }

  return data;
}

