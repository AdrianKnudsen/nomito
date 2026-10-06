/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // remotePatterns erstatter images.domains, som er deprecated i Next 15.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.spoonacular.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
