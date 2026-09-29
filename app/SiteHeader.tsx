'use client';
import {usePathname} from 'next/navigation';
import links from '../content/navigation.json';
export default function SiteHeader(){const path=usePathname();return <header className="analog-header"><a className="analog-brand" href="/thesis"><strong>ANALOG</strong><small>PHYSICAL INTELLIGENCE</small></a><nav className="analog-nav" aria-label="Primary navigation">{links.map(l=><a key={l.href} href={l.href} aria-current={path===l.href||(l.href==='/operating-stack'&&path==='/eand-stack')||(l.href==='/demos'&&(path.startsWith('/demos/')||path==='/lab'))?'page':undefined}>{l.label}</a>)}</nav></header>}
