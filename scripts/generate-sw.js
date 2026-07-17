#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const buildId = String(Date.now());
const template = fs.readFileSync(path.join(__dirname, 'sw-template.js'), 'utf8');
const output = template.replace('__BUILD_ID__', buildId);

const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sw.js'), output);
console.log(`Generated public/sw.js with BUILD_ID=${buildId}`);
