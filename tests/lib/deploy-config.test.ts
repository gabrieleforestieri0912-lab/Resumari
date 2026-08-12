import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(__dirname, '../..')
const vercel = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf-8'))
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))

describe('Vercel deployment config (vercel.json)', () => {
  it('uses the Next.js framework preset', () => {
    expect(vercel.framework).toBe('nextjs')
  })

  it('builds with the extension pipeline', () => {
    expect(vercel.buildCommand).toBe('npm run build:extension')
  })

  it('does not override the output directory (Vercel manages .next)', () => {
    expect(vercel.outputDirectory).toBeUndefined()
  })
})

describe('extension build scripts (package.json)', () => {
  it('chains next build with the extension packaging script', () => {
    expect(pkg.scripts['build:extension']).toBe('next build && npm run copy:extension')
    expect(pkg.scripts['copy:extension']).toBe('node scripts/build-extension.js')
  })

  it('declares a Node engine compatible with Next.js 16', () => {
    expect(pkg.engines?.node).toBe('>=20.9.0')
  })
})
