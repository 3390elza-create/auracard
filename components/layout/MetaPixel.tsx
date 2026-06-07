import Script from 'next/script'

// Meta (Facebook) Pixels — client-side analytics/conversion tracking.
// Pixel IDs are public, client-side identifiers (safe to embed). Never put a
// Meta access token here; that is a server-side secret and must stay in env.
// `fbq('track', 'PageView')` fires for every initialized pixel, so one track
// call covers all the IDs below.
const PIXEL_IDS = ['2345605889268259', '1485209126042142']

export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${PIXEL_IDS.map((id) => `fbq('init', '${id}');`).join('\n')}
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {PIXEL_IDS.map((id) => (
          <img
            key={id}
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
            alt=""
          />
        ))}
      </noscript>
    </>
  )
}
