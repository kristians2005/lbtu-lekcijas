import { describe, expect, it } from 'vitest'
import { parseDirectory, parseGroups, parseTimetable } from './parser.ts'

const directoryHtml = `<!doctype html><html><body>
<font color="GREEN">LBTU 2026.rudens Lekciju saraksts</font>
<table border="1"><tr><td>Programma</td><td><b>Pilna laika</b></td><td><b>Nepilna laika</b></td></tr>
<tr><td colspan="3"><b>Inženierzinātņu un informācijas tehnoloģiju fakultāte</b></td></tr>
<tr><td>&nbsp;&nbsp;G0903 Datorvadība un datorzinātne Bakalaura</td>
<td><a href="/pls/pub/pub_nod.main?p_mg=FO0064&amp;p_prog=G0903&amp;p_nod=B40101&amp;p_sem=C50034"><b>1-sem.</b></a></td>
<td><a href="/pls/pub/pub_nod.main?p_mg=FO0064&amp;p_prog=G0903&amp;p_nod=B40103&amp;p_sem=C50042"><b>9-sem.</b></a></td></tr></table>
</body></html>`

const timetableHtml = `<!doctype html><html><body>
<b>G0903 Datorvadība un datorzinātne</b><br><b>Visas grupas</b>
<a href="pub_nod.main?p_mg=FO0064&amp;p_prog=G0903&amp;p_nod=B40101&amp;p_sem=C50034&amp;p_grup=4774">1</a>
<a href="pub_nod.main?p_mg=FO0064&amp;p_prog=G0903&amp;p_nod=B40101&amp;p_sem=C50034&amp;p_grup=4775">2</a>
<table><tr><td></td><td><b>Pirmdiena</b></td><td><b>Otrdiena</b></td><td><b>Trešdiena</b></td><td><b>Ceturtdiena</b></td><td><b>Piektdiena</b></td><td><b>Sestdiena</b></td><td><b>Svētdiena</b></td></tr>
<tr><td><b>09.00-10.30</b></td><td>
<b><a href="/pls/pub/kursa_apraksts_pub/GDAT1009">DatZ1009 Programmēšanas pamati &amp; algoritmi</a></b> A <b>Lab.darbi</b><br>1.ned.-<i>01.09.2026-21.12.2026</i><br><i>1.gr. + 2.1.gr.</i><br>Šmits Ingus<br>221. aud. (2. stāvs), Pils, Lielā iela 2<br><br>
<b><a href="/pls/pub/kursa_apraksts_pub/GINT1034">InfT1033 Lietojumprogrammatūra</a></b> Bp <b>Lekcija</b><br><i>07.09.2026</i><br><i>05.10.2026</i><br>Plūme Lauris<br>317. aud. (3. stāvs), Pils, Lielā iela 2
</td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>
</body></html>`

describe('LBTU source parser', () => {
  it('extracts faculties, programmes, modes, semesters and source identifiers', () => {
    const result = parseDirectory(directoryHtml, 'https://lais.lbtu.lv/luis/lsarG.html')
    expect(result.period.id).toBe('FO0064')
    expect(result.period.alternatingWeekAnchor?.weekOneMonday).toBe('2026-09-07')
    expect(result.programmes).toHaveLength(1)
    expect(result.programmes[0]).toMatchObject({ code: 'G0903', faculty: 'Inženierzinātņu un informācijas tehnoloģiju fakultāte' })
    expect(result.programmes[0].selections.map((item) => [item.studyMode, item.semester, item.semesterId])).toEqual([
      ['full-time', 1, 'C50034'], ['part-time', 9, 'C50042'],
    ])
  })

  it('discovers group links with their exact IDs and valid query parameters', () => {
    const groups = parseGroups(timetableHtml, 'https://lais.lbtu.lv/pls/pub/pub_nod.main?p_prog=G0903')
    expect(groups.map((group) => [group.id, group.label])).toEqual([['4774', '1'], ['4775', '2']])
    expect(new URL(groups[0].sourceUrl).searchParams.get('p_prog')).toBe('G0903')
  })

  it('extracts every entry in a cell, entities, empty cells, and subgroup notes', () => {
    const snapshot = parseTimetable(timetableHtml, 'https://lais.lbtu.lv/schedule', 'selection', '2026-09-01T12:00:00Z')
    expect(snapshot.state).toBe('published')
    expect(snapshot.entries).toHaveLength(2)
    expect(snapshot.entries[0]).toMatchObject({
      courseTitle: 'Programmēšanas pamati & algoritmi', weekday: 1, startTime: '09:00', endTime: '10:30',
      lessonType: 'lab', teachers: ['Šmits Ingus'], groupNotes: ['1.gr. + 2.1.gr.'],
    })
    expect(snapshot.entries[0].recurrence).toMatchObject({ kind: 'known', alternatingWeek: 1 })
    expect(snapshot.entries[1].recurrence).toMatchObject({ kind: 'known', explicitDates: ['2026-09-07', '2026-10-05'] })
  })

  it('keeps separate alternating rules for multiple entries in one cell', () => {
    const twoRanges = timetableHtml
      .replace('<i>07.09.2026</i><br><i>05.10.2026</i>', '2.ned.-<i>01.09.2026-21.12.2026</i>')
    const snapshot = parseTimetable(twoRanges, 'https://lais.lbtu.lv/schedule', 'selection', '2026-09-01T12:00:00Z')
    expect(snapshot.entries).toHaveLength(2)
    expect(snapshot.entries.map((entry) => entry.recurrence)).toMatchObject([
      { kind: 'known', alternatingWeek: 1 },
      { kind: 'known', alternatingWeek: 2 },
    ])
  })

  it('does not mistake subgroup notes for alternating-week labels', () => {
    const subgroupOnly = timetableHtml.replace('1.ned.-', '')
    const snapshot = parseTimetable(subgroupOnly, 'https://lais.lbtu.lv/schedule', 'selection', '2026-09-01T12:00:00Z')
    expect(snapshot.entries[0].groupNotes).toContain('1.gr. + 2.1.gr.')
    expect(snapshot.entries[0].recurrence).toMatchObject({ kind: 'known' })
    expect(snapshot.entries[0].recurrence).not.toHaveProperty('alternatingWeek')
  })

  it('distinguishes a genuine empty timetable from an unrecognized source page', () => {
    const empty = timetableHtml.replace(/<b><a href="\/pls\/pub\/kursa_apraksts_pub\/GDAT1009">[\s\S]*?<\/td>/, '</td>')
    expect(parseTimetable(empty, 'https://lais.lbtu.lv/empty', 'empty', '2026-09-01T12:00:00Z').state).toBe('empty')
    expect(() => parseTimetable('<html><body>Kļūda</body></html>', 'https://lais.lbtu.lv/error', 'error', '2026-09-01T12:00:00Z')).toThrow(/timetable table/i)
  })

  it('does not turn exception text containing a date into an occurrence rule', () => {
    const exception = timetableHtml.replace('1.ned.-<i>01.09.2026-21.12.2026</i>', '<i>Nenotiek 07.09.2026</i>')
    const snapshot = parseTimetable(exception, 'https://lais.lbtu.lv/schedule', 'selection', '2026-09-01T12:00:00Z')
    expect(snapshot.entries[0].recurrence).toMatchObject({ kind: 'unknown' })
  })
})
