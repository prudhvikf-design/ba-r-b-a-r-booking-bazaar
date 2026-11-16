# Ba R B A R Booking Bazaar

Build a production-minded, mobile-first full-stack web application named BaRbaR for salon and barber discovery and appointment booking in India. Use a premium black, warm gold, and white visual identity, polished responsive layouts, accessible controls, and clear empty/loading/error states.

Create these complete user-facing areas:
1) Public landing page with BaRbaR branding, hero, search by city/area, featured salons, popular services, how it works, and clear sign-in/register actions.
2) Customer authentication and profile flow; customer home; salon discovery/search and filters; salon detail with photos/placeholders, address, opening hours, service menu, prices in INR, durations, barber/staff profiles; booking flow selecting service, staff (optional), date and available time; booking confirmation; upcoming/past booking history; cancel/reschedule actions with sensible confirmation.
3) Salon-owner dashboard with salon profile editing, service and price management, staff management, opening hours, and appointment list/status updates.
4) Admin dashboard with overview metrics and management screens for customers, salons, services, and bookings.
5) Role-aware navigation for customer, salon owner, and admin. Never expose admin functions to ordinary users.

Use a real persistent backend and secure authentication if the available Lovable backend is enabled. Create normalized database structures for profiles/roles, salons, staff, services, bookings, and opening hours; enforce ownership and role access server-side with row-level security. Booking creation must validate salon/service/staff availability and prevent double booking. Store money as integer paise or a safe numeric INR amount. Do not add payment processing yet; mark bookings as pending/confirmed and leave payments as a clearly future integration.

Seed clearly labeled demo salon/service/staff data so the preview is useful immediately, but do not represent demo records as real businesses. Add form validation, responsive mobile-first styling, and realistic sample content relevant to India. Do not hardcode secrets. If backend provisioning or any external configuration requires owner action, implement the UI and explain exactly what remains. Prioritize a working end-to-end demo flow over decorative complexity.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ba-r-b-a-r-booking-bazaar.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d62c55cf-949a-4ae4-ba66-a688b42aaff7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
