import type { CapacitorConfig } from "@capacitor/cli";

const role = process.env.BARBAR_APP_ROLE ?? "customer";
const appProfiles = {
  customer: {
    appId: "com.barbar.bookingbazaar.customer",
    appName: "BaRbaR Customer",
    startPath: "/home",
  },
  salon: {
    appId: "com.barbar.bookingbazaar.salon",
    appName: "BaRbaR Salon",
    startPath: "/owner",
  },
  admin: {
    appId: "com.barbar.bookingbazaar.admin",
    appName: "BaRbaR Admin",
    startPath: "/admin",
  },
} as const;

const profile = appProfiles[role as keyof typeof appProfiles] ?? appProfiles.customer;

const config: CapacitorConfig = {
  appId: profile.appId,
  appName: profile.appName,
  webDir: "android-web",
  server: {
    // Each APK opens its role-specific dashboard on the existing hosted BaRbaR site.
    // A network connection is required.
    url: `https://ba-r-b-a-r-booking-bazaar.lovable.app${profile.startPath}`,
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
