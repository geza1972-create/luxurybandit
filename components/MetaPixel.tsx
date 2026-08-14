"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { brauchtEinwilligung } from "@/lib/land-erkennen";

// Meta (Facebook) Pixel. ID is overridable via NEXT_PUBLIC_META_PIXEL_ID; falls back
// to the account pixel so it works out of the box.
const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "2587056621709307").trim();

// The base snippet fires PageView on first load. Next.js is client-routed, so we also
// fire PageView on every in-app navigation — otherwise Meta only ever sees one view.
// GDPR/ePrivacy: the marketing pixel loads ONLY after the user accepts cookies
// (lb_cookie_consent === "accepted"); until then nothing about Meta is loaded.
export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstLoad = useRef(true);
  const [consented, setConsented] = useState(false);

  // Ausserhalb Europas gibt es keine Einwilligungspflicht und deshalb auch kein Banner —
  // dort lädt das Pixel sofort (14.08.2026). In Europa bleibt es wie bisher: erst nach
  // „Accept". Die Grenze zieht `brauchtEinwilligung`, dieselbe Funktion wie im Banner,
  // damit beide nie auseinanderlaufen können.
  useEffect(() => {
    const check = () => {
      try {
        setConsented(localStorage.getItem("lb_cookie_consent") === "accepted" || !brauchtEinwilligung());
      } catch { /**/ }
    };
    check();
    window.addEventListener("lb-cookie-consent", check);
    return () => window.removeEventListener("lb-cookie-consent", check);
  }, []);

  useEffect(() => {
    if (!consented) return;
    if (firstLoad.current) { firstLoad.current = false; return; } // base snippet already counted it
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    if (fbq) fbq("track", "PageView");
  }, [pathname, searchParams, consented]);

  if (!PIXEL_ID || !consented) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" alt="" style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
