import PolyWater from './components/PolyWater'

const monoFont = { fontFamily: "'JetBrains Mono', monospace" }

const blue = {
  border: 'rgba(49, 120, 198, 0.65)',
  title: 'rgba(147, 197, 253, 0.97)',
  date: 'rgba(96, 165, 250, 0.90)',
  text: 'rgba(219, 234, 254, 0.97)',
}

type RolePart = string | { text: string; href: string }

function renderRole(role: string | RolePart[]) {
  if (typeof role === 'string') return role
  return role.map((part, i) =>
    typeof part === 'string'
      ? part
      : <a key={i} href={part.href} target="_blank" rel="noreferrer">{part.text}</a>
  )
}

function InfoBox({ title, rows }: { title: string; rows: { date: string; role: string | RolePart[] }[] }) {
  return (
    <div
      className="w-full border rounded-sm px-5 py-4"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(1,12,35,0.50)', borderColor: blue.border, boxShadow: `0 0 10px 0px rgba(49, 120, 198, 0.18), inset 0 0 6px 0px rgba(49, 120, 198, 0.06)` }}
    >
      <p className="text-base mb-1" style={{ ...monoFont, color: blue.title }}>
        {title}
      </p>
      {rows.map(({ date, role }) => (
        <div key={date + JSON.stringify(role)} className="flex w-full gap-6 mb-1 last:mb-0">
          <span
            className="text-sm whitespace-nowrap pt-px flex-shrink-0"
            style={{ ...monoFont, color: blue.date, minWidth: '18ch' }}
          >
            {date}
          </span>
          <span className="text-sm flex-1 min-w-0" style={{ ...monoFont, color: blue.text }}>
            {renderRole(role)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <PolyWater />
      <div
        className="absolute top-0 left-0 right-0 z-10 select-none"
        style={{ padding: '4rem 0', marginLeft: '25vw', marginRight: '25vw' }}
      >
        <h1 className="text-5xl font-semibold leading-tight" style={{ ...monoFont, color: blue.text }}>
          Ella Kim
        </h1>
        <p className="text-base mt-2" style={{ ...monoFont, color: blue.title }}>CS & Math @ Princeton</p>
        <div className="flex flex-col gap-4 mt-6">
          <InfoBox
            title="Experience"
            rows={[
              { date: '06/2026 – ', role: ['Machine Learning Intern @ ', { text: 'High Meadows Environmental Institute', href: 'https://environment.princeton.edu/' }] },
              { date: '02/2026 – ', role: ['Researcher (spectral graph theory) @ ', { text: 'Princeton CS', href: 'https://www.cs.princeton.edu/' }] },
              { date: '09/2025 – ', role: ['Software Developer @ ', { text: 'Hoagie Club', href: 'https://hoagie.io'}] } ,
              { date: '02/2024 – 02/2025', role: ['Researcher (cryptography) @ ', { text: 'MIT PRIMES', href: 'https://math.mit.edu/research/highschool/primes/' }] },
              { date: 'Summer 2023, 2024', role: ['Researcher (graph theory) @ ', { text: 'PROMYS', href: 'https://promys.org/' }] },
            ]}
          />
          <InfoBox
            title="Leadership"
            rows={[
              { date: '09/2025 –', role: ['Director @ ', { text: 'Princeton University Mathematics Competition', href: 'https://pumac.princeton.edu' }] },
              { date: '02/2026 –', role: ['Officer @ Princeton PUZZLES Club & ', { text: 'Princeton Puzzle Hunt', href: 'https://puzzles.princeton.edu/' }] },
              { date: '07/2026 –', role: ['Partnerships Team Organizer @ ', { text: 'HackPrinceton', href: 'https://www.hackprinceton.com/' }] },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
