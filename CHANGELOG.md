# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Backup Strategy
Before making significant changes to any file, a backup will be created in the `backups/` directory with the following naming convention:
- Format: `original_filepath/filename.YYYYMMDD_HHMM.bak`
- Example: `backups/app/plugin.tsx.20240327_1430.bak`

This allows us to:
1. Keep track of our own modifications
2. Rollback to previous working versions if needed
3. Compare changes between different versions of our customizations

## [Unreleased]

### Fixed
- CORS issues with GitHub content loading in plugins
  - Added GitHub proxy configuration in `next.config.mjs`
  - Modified plugin loading mechanism in `app/components/plugin.tsx`
  - Updated `PLUGINS_REPO_URL` in `app/constant.ts` to use raw GitHub URLs

### Changed
- Updated proxy configuration in `next.config.mjs` to handle raw GitHub content
  - Backup: `backups/next.config.mjs.20240327_1430.bak`
- Modified plugin loading logic in `app/components/plugin.tsx` to use proxy for GitHub content
  - Backup: `backups/app/plugin.tsx.20240327_1430.bak`
- Changed `PLUGINS_REPO_URL` in `app/constant.ts` to point to raw GitHub content
  - Backup: `backups/app/constant.ts.20240327_1430.bak`
- Updated `public/plugins.json` with trading-focused plugins:
  - CoinMarketSearch: Cryptocurrency market data
  - TradingSignalHub: Trading signals for crypto
  - MarketNewsDigest: Financial news aggregator
  - ETFLookup: ETF search and analysis
  - InsiderFlow: Insider trading information
  - Backup: `backups/plugins.json.20240327_1430.bak`

### Added
- Created CHANGELOG.md for tracking project changes
- Added GitHub proxy route in Next.js configuration
- Implemented backup strategy for tracking our own modifications

[Unreleased]: https://github.com/yourusername/trademaster6/compare/main...HEAD 