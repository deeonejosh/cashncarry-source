#!/usr/bin/env python3
"""Offline customer-surface/route/control safety gate; does NOT claim a live click test."""
import argparse
import json
import pathlib
import re
import sys

WEB = pathlib.Path(__file__).resolve().parents[1]
ROOT = WEB.parent
SRC = WEB / 'src'
FORBIDDEN_LABELS = (
    'V17 Staging ZIP', 'QA Suite', 'Export ZIP', 'Chidi Okafor',
    'Private Staging - Worker & D1', 'Run Automated Staging Diagnostic',
    'Cash-N-Carry-Staging-V17-Repaired.zip',
)

# JSX attributes can contain arrow callbacks with > inside braces: use a basic lexer.
def get_opening_tags(text, name):
    prefix = re.compile(r'<'+re.escape(name)+r'\b')
    for m in prefix.finditer(text):
        start, idx = m.start(), m.end()
        depth, quote, esc = 0, None, False
        while idx < len(text):
            c = text[idx]
            if quote:
                if esc: esc = False
                elif c == '\\': esc = True
                elif c == quote: quote = None
            else:
                if c in ('"', "'", '`'): quote = c
                elif c == '{': depth += 1
                elif c == '}' and depth: depth -= 1
                elif c == '>' and depth == 0: break
            idx += 1
        if idx >= len(text): raise ValueError(f'Unterminated <{name} at {start}')
        yield text[start:idx+1], text.count('\n',0,start)+1


def scan():
    errors, warnings = [], []
    src = {str(p.relative_to(WEB)): p.read_text(errors='replace') for p in SRC.rglob('*.tsx')}
    app = src['src/App.tsx']
    tabs = set(re.findall(r"case\s+'([a-z][a-z0-9-]+)'\s*:", app))
    navigations = {}
    for name, body in src.items():
        for target in re.findall(r"(?:setCurrentTab|navigateTab|onNavigate)\(\s*['\"]([a-z][a-z0-9-]+)['\"]", body):
            navigations.setdefault(target,[]).append(name)
    # Modal state tabs (verify, register, login, reset) are intentionally not routes.
    unknown = sorted(set(navigations)-tabs-{'register','verify','login','reset'})
    if unknown: errors.append('Unknown navigation destinations: '+repr(unknown))
    counts={'routes':len(tabs),'navigation_targets':len(navigations),'page_components':len(list((SRC/'components/pages').rglob('*.tsx'))), 'buttons':0,'forms':0,'disabled_buttons':0,'submit_buttons':0,'click_buttons':0,'inert_buttons':0}
    for name, body in src.items():
        for tag, ln in get_opening_tags(body,'button'):
            counts['buttons']+=1
            if re.search(r'\bdisabled\b',tag): counts['disabled_buttons']+=1
            if 'onClick=' in tag: counts['click_buttons']+=1
            if re.search(r'\btype\s*=\s*["\']submit["\']',tag): counts['submit_buttons']+=1
            if 'onClick=' not in tag and not re.search(r'\btype\s*=\s*["\']submit["\']|\bdisabled\b',tag):
                counts['inert_buttons']+=1
                warnings.append(f'{name}:{ln}: button has no handler, submit or disabled state')
        counts['forms']+=sum(1 for _ in get_opening_tags(body,'form'))
        for label in FORBIDDEN_LABELS:
            if label in body:errors.append(f'Forbidden customer-facing content in {name}: {label}')
    # Remove the top development ribbon in customer nav; normal login remains.
    nav=src['src/components/ui/Navbar.tsx']
    if 'Top Marketplace Utility Bar' in nav or 'bg-[#073c22] px-3 sm:px-4 py-1.5' in nav:
        errors.append('An auxiliary toolbar still exists in customer header')
    if 'Sign In / Create Account' not in nav or 'onClick={() => openAuthModal()}' not in nav:
        errors.append('Guest sign-in access is missing from main navigation')
    pkg=json.loads((WEB/'package.json').read_text())
    if 'package:zip' in pkg['scripts'] or 'scripts/package-zip.py' in str(pkg['scripts']):
        errors.append('Public source archive packaging is reachable from npm scripts')
    if (WEB/'scripts/package-zip.py').exists(): errors.append('Legacy staging source ZIP packager still included')
    if 'INSERT OR IGNORE INTO stores' in (WEB/'deploy/chatgpt-sites/staging-init-complete.sql').read_text():
        errors.append('Bootstrap SQL still inserts fake shops')
    if 'INSERT OR IGNORE INTO products' in (WEB/'deploy/chatgpt-sites/staging-init-complete.sql').read_text():
        errors.append('Bootstrap SQL still inserts fake products')
    for init in ('catalog-init.sql', 'staging-init-complete.sql'):
        sql = (WEB/'deploy/chatgpt-sites'/init).read_text()
        if re.search(r'INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(?:stores|products)\s*\(', sql, re.I):
            errors.append(init+' re-seeds demo seller/product records')
    if not (WEB/'public/robots.txt').read_text().strip().endswith('Disallow: /'):
        errors.append('Private-staging robots protection absent')
    webpublic=WEB/'public'
    for f in webpublic.rglob('*'):
        if f.is_file() and f.suffix.lower()=='.zip': errors.append('Public ZIP artifact: '+str(f.relative_to(WEB)))
    return errors, warnings, counts


def check_dist(errors):
    dist=WEB/'dist'
    if not dist.is_dir():errors.append('Missing compiled dist; build with npm run build');return {'assets':0}
    count=0
    for p in dist.rglob('*'):
        if not p.is_file():continue
        count+=1
        if p.suffix.lower()=='.zip':errors.append('Build exposes source ZIP: '+str(p.relative_to(WEB)))
        if p.name == '_worker.js':errors.append('Build exposes raw Worker server bundle under public assets: '+str(p.relative_to(WEB)))
        if p.suffix.lower() in ('.js','.html','.css','.txt'):
            t=p.read_text(errors='replace')
            for marker in FORBIDDEN_LABELS:
                if marker in t:errors.append('Built asset contains developer UI: '+str(p.relative_to(WEB))+' :: '+marker)
        if 'aistudio' in p.parts:errors.append('Build contains editor assets: '+str(p.relative_to(WEB)))
    return {'assets':count}


if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--dist',action='store_true')
    args=ap.parse_args()
    errors, warnings, counts=scan()
    if args.dist:counts.update(check_dist(errors))
    print(json.dumps({'counts':counts,'errors':errors,'warnings':warnings[:30]},indent=2))
    sys.exit(1 if errors or warnings else 0)
