import type { ClickHouseClient } from '../../src'
import { Rows } from '../../src'
import * as ch from '../../src/schema'
import { QueryFormatter } from '../../src/schema/query_formatter'
import { Readable } from 'stream'

describe('schema select result', () => {
  const client: ClickHouseClient = {
    command: () => {
      // stub
    },
  } as any
  const schema = new ch.Schema({
    id: ch.UInt32,
    name: ch.String,
  })
  const table = new ch.Table(client, {
    name: 'data_table',
    schema,
  })

  beforeEach(() => {
    jest
      .spyOn(QueryFormatter, 'select')
      .mockReturnValueOnce('SELECT * FROM data_table')
    jest
      .spyOn(client, 'command')
      .mockResolvedValueOnce(
        new Rows(
          Readable.from(['{"valid":"json"}\n', 'invalid_json}\n']),
          'JSONEachRow'
        )
      )
  })

  it('should not swallow error during select stream consumption', async () => {
    const { asyncGenerator } = await table.select()

    expect((await asyncGenerator().next()).value).toEqual({ valid: 'json' })
    await expect(asyncGenerator().next()).rejects.toMatchObject({
      message: expect.stringContaining('Unexpected token'),
    })
  })

  it('should not swallow error while converting stream to json', async () => {
    await expect(table.select().then((r) => r.json())).rejects.toMatchObject({
      message: expect.stringContaining('Unexpected token'),
    })
  })
})