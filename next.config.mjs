/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/inplannen", destination: "/kiwis/inplannen" },
      { source: "/", destination: "/kiwis/" },
      { source: "/ical.ics", destination: "/kiwis/ical.ics" },
    ];
  },
};

export default nextConfig;
