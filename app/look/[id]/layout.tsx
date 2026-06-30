import type { Metadata } from "next";

type Look = {
  id: string;
  name: string;
  imageUrl: string;
  category?: string;
  price?: string;
  salePrice?: string;
  curatorName?: string;
};

async function getLookData(id: string): Promise<Look | null> {
  try {
    // Extract real ID from slug format "name--look-id" (support legacy: raw ID or plain name slug)
    const ddIdx = id.lastIndexOf("--");
    const resolvedId = ddIdx >= 0 ? id.slice(ddIdx + 2) : id;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
    const res = await fetch(`${baseUrl}/api/try-this-look?lookId=${encodeURIComponent(resolvedId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const look = data.looks?.[0];
    return look || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const look = await getLookData(id);

  if (!look) {
    return {
      title: "Look Not Found",
      description: "This look doesn't exist or has been removed.",
    };
  }

  // Generate clean title: "[Look name] — Get the Look | Luxurybandit"
  // Example: "Black Plunge Maxi Dress — Get the Look | Luxurybandit"
  const lookDescription = look.name?.trim() || "Luxury Look";
  const title = `${lookDescription} — Get the Look | Luxurybandit`;

  // Generate description: "Try [look] on your own photo and shop the whole
  // look at any price, from the high-end original to the budget version..."
  const description = `Try ${lookDescription} on your own photo and shop the whole look at any price, from the high-end original to the budget version. Get the look on Luxurybandit.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/look/${encodeURIComponent(id)}`,
      images: look.imageUrl
        ? [
            {
              url: look.imageUrl,
              width: 1200,
              height: 1200,
              alt: lookDescription,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: look.imageUrl ? [look.imageUrl] : [],
    },
  };
}

export default function LookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
