import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  name: "BaseRush",
  description: "Mine daily rewards and play tap puzzle games on Base.",
  bannerImageUrl: "https://baserush.vercel.app/banner.png",
  iconImageUrl: "https://baserush.vercel.app/icon.png",
  homeUrl: "https://baserush.vercel.app",
  splashImageUrl : "hhttps://baserush.vercel.app/splash.png",
  splashBackgroundColor: "#0EA5E9",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
