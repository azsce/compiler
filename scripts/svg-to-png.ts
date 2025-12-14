#!/usr/bin/env bun
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { basename, dirname, join } from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: bun scripts/svg-to-png.ts <input.svg> [output.png] [width]');
  console.log('');
  console.log('Arguments:');
  console.log('  input.svg   - Path to the SVG file to convert');
  console.log('  output.png  - Optional output path (defaults to same name with .png)');
  console.log('  width       - Optional width in pixels (defaults to 1400)');
  console.log('');
  console.log('Examples:');
  console.log('  bun scripts/svg-to-png.ts docs/diagram.svg');
  console.log('  bun scripts/svg-to-png.ts docs/diagram.svg docs/diagram.png 2000');
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1] || inputPath.replace(/\.svg$/i, '.png');
const width = parseInt(args[2]) || 1400;

if (!existsSync(inputPath)) {
  console.error(`Error: File not found: ${inputPath}`);
  process.exit(1);
}

if (!inputPath.toLowerCase().endsWith('.svg')) {
  console.error('Error: Input file must be an SVG file');
  process.exit(1);
}

try {
  const svgBuffer = readFileSync(inputPath);
  
  await sharp(svgBuffer)
    .resize(width)
    .png()
    .toFile(outputPath);
  
  console.log(`✓ Converted: ${inputPath} → ${outputPath} (width: ${width}px)`);
} catch (err) {
  console.error('Error converting SVG:', err);
  process.exit(1);
}
