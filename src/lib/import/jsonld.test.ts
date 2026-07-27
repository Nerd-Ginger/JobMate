import { describe, it, expect } from 'vitest'
import { parseJsonLd } from './jsonld'
import { htmlToText } from './html'

const JOB_LD = {
  '@context': 'https://schema.org/',
  '@type': 'JobPosting',
  title: 'Senior Frontend Engineer',
  hiringOrganization: { '@type': 'Organization', name: 'Acme Corp' },
  jobLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Austin',
      addressRegion: 'TX',
      addressCountry: 'US',
    },
  },
  baseSalary: {
    '@type': 'MonetaryAmount',
    currency: 'USD',
    value: { '@type': 'QuantitativeValue', minValue: 150000, maxValue: 190000 },
  },
  skills: ['React', 'TypeScript'],
  description: '<p>Build <b>great</b> UIs.</p>',
}

function pageWith(ld: unknown): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>x</body></html>`
}

describe('parseJsonLd', () => {
  it('extracts a JobPosting from an embedded script', () => {
    const p = parseJsonLd(pageWith(JOB_LD), 'https://acme.com/job')
    expect(p).not.toBeNull()
    expect(p!.company).toBe('Acme Corp')
    expect(p!.title).toBe('Senior Frontend Engineer')
    expect(p!.location).toBe('Austin, TX, US')
    expect(p!.salary).toContain('150000')
    expect(p!.skills).toEqual(['React', 'TypeScript'])
    expect(p!.description).toContain('Build great UIs')
  })

  it('finds JobPosting inside @graph', () => {
    const p = parseJsonLd(pageWith({ '@graph': [{ '@type': 'WebSite' }, JOB_LD] }), 'u')
    expect(p?.title).toBe('Senior Frontend Engineer')
  })

  it('returns null when there is no JobPosting', () => {
    expect(parseJsonLd(pageWith({ '@type': 'WebSite' }), 'u')).toBeNull()
    expect(parseJsonLd('<html><body>no ld</body></html>', 'u')).toBeNull()
  })
})

describe('htmlToText', () => {
  it('strips tags, scripts, and styles', () => {
    const text = htmlToText(
      '<div>Hello <script>bad()</script><style>x{}</style><b>world</b></div>',
    )
    expect(text).toContain('Hello')
    expect(text).toContain('world')
    expect(text).not.toContain('bad()')
    expect(text).not.toContain('x{}')
  })
})
