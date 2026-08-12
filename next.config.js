const pkg = require('./package.json')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    // Build-Zeit-Version direkt aus package.json (Single Source of Truth)
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
}

module.exports = nextConfig