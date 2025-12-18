import type { Metadata } from "next";
import "~/app/globals.css";
import { Providers } from "~/app/providers";
import { METADATA } from "~/lib/utils";

/**
 * ✅ Base Mini App Embed + Verification
 * ⚠️ export const metadata ব্যবহার করা যাবে না
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: METADATA.name,
    description: METADATA.description,

    other: {
      // ✅ Base App verification
      "base:app_id": "69417ec2d19763ca26ddc35b",

      // ✅ Base Embed / Image Preview (VERY IMPORTANT)
      "fc:miniapp": JSON.stringify({
        version: "1",
        imageUrl: "https://baserush.vercel.app/hero.png", // 1200x630
        button: {
          title: "Open BaseRush",
          action: {
            name: "Launch BaseRush",
            url: METADATA.homeUrl,
          },
        },
      }),
    },
  };
}

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
