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

### Added
- New Admin Dashboard
  - User management interface
  - Usage statistics tracking
  - Subscription management
  - User profile editing capabilities
- Access Control System
  - Role-based access control (admin, premium, basic)
  - Feature limits based on subscription level
  - User tier management
- Trading-Focused Plugins
  - CoinMarketSearch: Cryptocurrency market data
  - TradingSignalHub: Trading signals for crypto
  - MarketNewsDigest: Financial news aggregator
  - ETFLookup: ETF search and analysis
  - InsiderFlow: Insider trading information

### Changed
- Renamed "Masks" to "Bots" throughout the codebase
  - Updated store implementation from `mask.ts` to `bot.ts`
  - Renamed all mask-related functions and types
  - Updated constants in `constant.ts`
  - Updated package.json scripts
  - Renamed directory from `app/masks` to `app/bots`
- Updated proxy configuration in `next.config.mjs`
- Modified plugin loading logic
- Changed `PLUGINS_REPO_URL` in `app/constant.ts`

### Fixed
- CORS issues with GitHub content loading in plugins
- Added GitHub proxy configuration
- Implemented backup strategy for tracking modifications

### Technical Details
- Added CHANGELOG.md for tracking project changes
- Implemented backup strategy for tracking modifications
- Added GitHub proxy route in Next.js configuration
- Updated all internal references to use consistent terminology

### Migration Notes
- Existing mask data will be automatically migrated to the new bot terminology
- No user action required for the migration
- All existing functionality remains the same

## [Previous Versions]

### Version 1.0.0
- Initial release
- Basic chat functionality
- Theme system implementation
- User authentication

[Unreleased]: https://github.com/yourusername/trademaster6/compare/main...HEAD 