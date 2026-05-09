import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  parseFlowchartFromBase64,
  parseFlowchartFromText,
  serializeFlowchart,
  serializeFlowchartToBase64,
} from './flowchart-io'

describe('flowchart import/export', () => {
  it('serializes and parses a valid flowchart', () => {
    const placedBlocks = [
      { id: 'src', type: 'ascii', x: 120, y: 200, text: 'AB' },
      { id: 'fmt', type: 'formatConvert', x: 300, y: 200, fcOutputFormat: 'hex' },
      { id: 'out', type: 'output', x: 500, y: 200 },
    ]
    const edges = [
      { id: 'e1', from: { blockId: 'src', portKey: 'out' }, to: { blockId: 'fmt', portKey: 'in' } },
      { id: 'e2', from: { blockId: 'fmt', portKey: 'out' }, to: { blockId: 'out', portKey: 'in' } },
    ]

    const exported = serializeFlowchart(placedBlocks, edges)
    const imported = parseFlowchartFromText(exported)

    expect(imported.placedBlocks).toEqual(placedBlocks)
    expect(imported.edges).toEqual(edges)
  })

  it('serializes and parses a valid flowchart as base64', () => {
    const placedBlocks = [{ id: 'src', type: 'ascii', x: 120, y: 200, text: 'AB' }]
    const edges = []
    const exported = serializeFlowchartToBase64(placedBlocks, edges)
    const imported = parseFlowchartFromBase64(exported)
    expect(imported.placedBlocks).toEqual(placedBlocks)
    expect(imported.edges).toEqual(edges)
  })

  it('parses legacy uncompressed Base64 flowchart data', () => {
    const placedBlocks = [{ id: 'src', type: 'ascii', x: 120, y: 200, text: 'AB' }]
    const edges = []
    const exportedRaw = serializeFlowchart(placedBlocks, edges)
    const base64 = Buffer.from(exportedRaw, 'utf8').toString('base64')
    const imported = parseFlowchartFromBase64(base64)
    expect(imported.placedBlocks).toEqual(placedBlocks)
    expect(imported.edges).toEqual(edges)
  })

  it('keeps only the latest edge for an input port on import', () => {
    const imported = parseFlowchartFromText(
      JSON.stringify({
        version: 1,
        placedBlocks: [
          { id: 'a', type: 'ascii', x: 0, y: 0, text: 'A' },
          { id: 'b', type: 'ascii', x: 0, y: 0, text: 'B' },
          { id: 'fmt', type: 'formatConvert', x: 0, y: 0 },
        ],
        edges: [
          { id: 'e1', from: { blockId: 'a', portKey: 'out' }, to: { blockId: 'fmt', portKey: 'in' } },
          { id: 'e2', from: { blockId: 'b', portKey: 'out' }, to: { blockId: 'fmt', portKey: 'in' } },
        ],
      }),
    )

    expect(imported.edges).toEqual([
      { id: 'e2', from: { blockId: 'b', portKey: 'out' }, to: { blockId: 'fmt', portKey: 'in' } },
    ])
  })

  it('throws for invalid flowchart files', () => {
    expect(() =>
      parseFlowchartFromText(
        JSON.stringify({
          placedBlocks: [{ id: 'bad', type: 'unknown', x: 0, y: 0 }],
          edges: [],
        }),
      ),
    ).toThrow('unknown type')

    expect(() =>
      parseFlowchartFromText(
        JSON.stringify({
          placedBlocks: [
            { id: 'same', type: 'ascii', x: 0, y: 0, text: 'A' },
            { id: 'same', type: 'hex', x: 1, y: 1, text: '41' },
          ],
          edges: [],
        }),
      ),
    ).toThrow('duplicated')

    expect(() =>
      parseFlowchartFromText(
        JSON.stringify({
          placedBlocks: [{ id: 'a', type: 'ascii', x: 0, y: 0, text: 'A' }],
          edges: [
            { id: 'e1', from: { blockId: 'missing', portKey: 'out' }, to: { blockId: 'a', portKey: 'in' } },
          ],
        }),
      ),
    ).toThrow('references missing blocks')

    expect(() => parseFlowchartFromBase64('!not-base64!')).toThrow(
      'Could not decode Base64 flowchart text.',
    )
  })
})
