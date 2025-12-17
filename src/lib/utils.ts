import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const METADATA = {
  name: "BaseRush",
  description: "Mine daily rewards and play tap puzzle games on Base.",

  // 🔥 Hero / Preview (1200x630)
  bannerImageUrl: "https://baserush.vercel.app/hero.png",

  // App icon (1024x1024)
  iconImageUrl: "https://baserush.vercel.app/icon.png",

  // App home
  homeUrl: "https://baserush.vercel.app",

  // Splash (200x200) ✅ typo fixed
  splashImageUrl: "https://baserush.vercel.app/splash.png",

  splashBackgroundColor: "#0EA5E9",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
