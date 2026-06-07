import { getAccountId } from "@/lib/billing";
import { deleteGalleryImage, listGalleryImages, uploadGalleryImage, type GalleryImageType } from "@/lib/supabase-storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const accountId = getAccountId(request);
    const images = await listGalleryImages(accountId);
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gallery could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const accountId = getAccountId(request);
    const payload = (await request.json()) as { type?: GalleryImageType; image?: string };

    if (payload.type !== "upload" && payload.type !== "cutout" && payload.type !== "shop-image" && payload.type !== "model-image") {
      return NextResponse.json({ error: "Invalid gallery image type." }, { status: 400 });
    }

    if (!payload.image?.startsWith("data:image/")) {
      return NextResponse.json({ error: "No image received." }, { status: 400 });
    }

    const path = await uploadGalleryImage(accountId, payload.type, payload.image);
    const images = await listGalleryImages(accountId);
    const uploadedImage = images.find((image) => image.path === path) ?? null;
    return NextResponse.json({ images, image: uploadedImage, path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image could not be saved." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const accountId = getAccountId(request);
    const payload = (await request.json()) as { path?: string };
    const path = payload.path ?? "";

    if (!path.startsWith(`${accountId}/`)) {
      return NextResponse.json({ error: "Invalid gallery image path." }, { status: 400 });
    }

    await deleteGalleryImage(path);
    const images = await listGalleryImages(accountId);
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image could not be deleted." },
      { status: 500 }
    );
  }
}
