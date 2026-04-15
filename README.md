# Structural Deprivation Analysis System

An interactive simulation tool for analyzing infrastructure deprivation using Afrobarometer Round 9 data. This tool demonstrates the "hidden poor" phenomenon where subjective poverty measures diverge from objective structural realities.

## Features

### Core Analysis
- **LPI-based predictions**: Model infrastructure access based on Lived Poverty Index threat levels
- **Demographic factors**: Adjust for urban/rural split and education distribution
- **Country-specific calibration**: 15 African countries with validated baseline data
- **Three key metrics**: Water grid access, potable supply, and external resupply needs

### Enhanced Capabilities
- **Data Export**: Download analysis results as JSON or CSV
- **Scenario Management**: Save and compare multiple scenarios side-by-side
- **Preset Configurations**: Quick-load urban, rural, or mixed demographic profiles
- **Hidden Vulnerability Detection**: Identifies populations missed by traditional poverty measures

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Methodology

The simulation uses a log-odds adjustment model based on Afrobarometer R9 data (Tables A.3–A.5, Figures 5–7):

1. **Baseline**: LPI threat level determines base probability
2. **Urban/Rural Adjustment**: Applied as additive log-odds offset
3. **Education Adjustment**: Weighted by education distribution
4. **Country Calibration**: Anchored at null-poverty baseline for 15 countries

**Limitations**: V1 assumes factor independence. Joint distributions pending in V2.

## Data Sources

- **Afrobarometer Round 9**: 39 sectors, N=53,444, field verified
- **Countries**: Kenya, Tanzania, Ethiopia, Ghana, Mali, Sudan, Gambia, Namibia, Botswana, Cabo Verde, Tunisia, South Africa, Morocco, Seychelles, Mauritius
- **Metrics**: Clean water access, piped water infrastructure, off-compound water procurement

## Use Cases

- Policy scenario analysis
- Infrastructure investment planning
- Hidden poverty identification
- Demographic impact modeling
- Cross-country comparison

## Technical Stack

- React 18
- Vite
- Pure CSS (no frameworks)
- No external dependencies

## License

This is a proof-of-concept tool based on publicly available Afrobarometer data.
