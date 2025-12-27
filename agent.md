# Agent Guidelines

## Project Scripts

### SVG to PNG Conversion

To convert SVG files to PNG for use in documentation (especially PDF generation), use:

```bash
cd vite-project
bun scripts/svg-to-png.ts <input.svg> [output.png] [width]
```

Arguments:
- `input.svg` - Path to the SVG file to convert (required)
- `output.png` - Output path (optional, defaults to same name with .png extension)
- `width` - Width in pixels (optional, defaults to 1400)

Examples:
```bash
bun scripts/svg-to-png.ts docs/diagram.svg
bun scripts/svg-to-png.ts docs/grammar-bnf.svg docs/grammar-bnf.png 2000
```

## PDF Generation

To generate the compiler report PDF, run from the docs directory:

```bash
cd docs
pandoc title-page.yaml 00-introduction.md 01-lexical-analysis.md 02-syntax-analysis.md 03-semantic-analysis.md 04-pipeline.md -o mini-compiler-report.pdf --pdf-engine=xelatex
```

## Testing

Run tests with:
```bash
cd vite-project
bun test
```
