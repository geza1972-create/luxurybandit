import { completeReservation, getAccountId, refundReservation, reserveCredits } from "@/lib/billing";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const AILABTOOLS_TRY_ON_ENDPOINT =
  process.env.AILABTOOLS_TRY_ON_ENDPOINT ?? "https://www.ailabapi.com/api/portrait/editing/try-on-clothes";
const AILABTOOLS_STATUS_ENDPOINT =
  process.env.AILABTOOLS_STATUS_ENDPOINT ?? "https://www.ailabapi.com/api/common/query-async-task-result";

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function readAilabError(payload: any, fallback: string) {
  if (!payload) return fallback;
  const errorMsg = payload?.error_msg;
  const errorCode = payload?.error_code_str || payload?.error_code;
  const detail = payload?.error_detail;
  const detailMessage = detail?.message || detail?.code_message || detail?.code;
  const error = payload?.error;

  if (errorMsg) return errorCode ? `${errorCode}: ${errorMsg}` : String(errorMsg);
  if (detailMessage) return String(detailMessage);
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  return fallback;
}

export async function POST(request: Request) {
  const apiKey = process.env.AILABTOOLS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AILABTOOLS_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const personImage = formData.get("personImage");
  const clothesImage = formData.get("image");
  const clothesType = String(formData.get("clothesType") ?? "full_body").trim();

  if (!(personImage instanceof File)) {
    return NextResponse.json({ error: "AILabTools braucht ein Personenfoto. Bitte zuerst ein Originalbild hochladen." }, { status: 400 });
  }

  if (!(clothesImage instanceof File)) {
    return NextResponse.json({ error: "Kein Kleidungsbild erhalten." }, { status: 400 });
  }

  const normalizedClothesType = ["upper_body", "lower_body", "full_body"].includes(clothesType) ? clothesType : "full_body";

  const accountId = getAccountId(request);
  const reservation = reserveCredits(accountId, "fashion-model");
  if (!reservation.ok) {
    return NextResponse.json(
      {
        error: reservation.error,
        credits: reservation.status
      },
      { status: 402 }
    );
  }

  const tryOnFormData = new FormData();
  tryOnFormData.append("task_type", "async");
  tryOnFormData.append("person_image", personImage);
  tryOnFormData.append("clothes_image", clothesImage);
  tryOnFormData.append("clothes_type", normalizedClothesType);

  const createResponse = await fetch(AILABTOOLS_TRY_ON_ENDPOINT, {
    method: "POST",
    headers: {
      "ailabapi-api-key": apiKey
    },
    body: tryOnFormData
  });

  const createPayload = await readJson(createResponse);

  if (!createResponse.ok || createPayload?.error_code) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json(
      {
        error: `AILabTools konnte das Bild nicht starten: ${readAilabError(createPayload, "Unbekannter Fehler.")}`,
        credits
      },
      { status: createResponse.status || 502 }
    );
  }

  const taskId = createPayload?.task_id;
  if (!taskId) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json({ error: "AILabTools hat keine task_id zurückgegeben.", credits }, { status: 502 });
  }

  for (let attempt = 0; attempt < 36; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(`${AILABTOOLS_STATUS_ENDPOINT}?task_id=${encodeURIComponent(taskId)}`, {
      headers: {
        "ailabapi-api-key": apiKey
      }
    });
    const statusPayload = await readJson(statusResponse);

    if (!statusResponse.ok || statusPayload?.error_code) {
      const credits = refundReservation(accountId, reservation.reservationId);
      return NextResponse.json(
        {
          error: `AILabTools konnte den Status nicht laden: ${readAilabError(statusPayload, "Unbekannter Fehler.")}`,
          credits
        },
        { status: statusResponse.status || 502 }
      );
    }

    const status = Number(statusPayload?.task_status);
    if (status === 2) {
      const imageUrl = statusPayload?.data?.image;
      if (!imageUrl) {
        const credits = refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "AILabTools hat kein Bild zurückgegeben.", credits }, { status: 502 });
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        const credits = refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "AILabTools Bild konnte nicht geladen werden.", credits }, { status: 502 });
      }

      const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
      return NextResponse.json({
        image: `data:image/png;base64,${imageBytes.toString("base64")}`,
        credits: completeReservation(accountId, reservation.reservationId)
      });
    }
  }

  const credits = refundReservation(accountId, reservation.reservationId);
  return NextResponse.json({ error: "AILabTools timeout after 3 minutes.", credits }, { status: 504 });
}
