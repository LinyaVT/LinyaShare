const pkg = require('./package.json')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    // Build-time version straight from package.json (single source of truth)
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
}

module.exports = nextConfig