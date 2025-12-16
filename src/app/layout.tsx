import type { Metadata } from "next";
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { METADATA } from "~/lib/utils";

export const metadata: Metadata = {
  title: METADATA.name,

  // 🔴 এই অংশটা Base App verification এর জন্য দরকার
  other: {
    "base:app_id": "69417ec2d19763ca26ddc35b",
  },

  openGraph: {
    title: METADATA.name,
    description: METADATA.description,
    images: [METADATA.bannerImageUrl],
    url: METADATA.homeUrl,
    siteName: METADATA.name,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
