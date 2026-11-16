/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the dev server hydrate when opened over the local network, not only on localhost.
  allowedDevOrigins: ["jari.computer"],
  async rewrites() {
    return [
      { source: "/inplannen", destination: "/kiwis/inplannen" },
      { source: "/", destination: "/kiwis/" },
      { source: "/ical.ics", destination: "/kiwis/ical.ics" },
    ];
  },
};

export default nextConfig;
