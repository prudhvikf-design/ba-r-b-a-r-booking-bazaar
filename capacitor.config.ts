import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.barbar.bookingbazaar",
  appName: "BaRbaR Booking Bazaar",
  webDir: "android-web",
  server: {
    // The Android app loads the published BaRbaR web application.
    // An internet connection is required for the live booking experience.
    url: "https://ba-r-b-a-r-booking-bazaar.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
