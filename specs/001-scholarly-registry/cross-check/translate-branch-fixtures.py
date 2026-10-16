"""T117. Mechanically translate the parallel branch's fixtures into main's identifier and lifecycle shape.

Only the naming layer is translated (ids, references, lifecycle/release, room ids, essay stage
spelling). Structural differences are left as they are, so the gate reports them.
"""
import pathlib
import re
import shutil
import sys

import yaml

src = pathlib.Path(sys.argv[1])  # branch fixtures/valid
dst = pathlib.Path(sys.argv[2])  # registry root to write
FAMILIES = 'place|source|map|layer|dataset|collection|cartographer|bibliography|room|essay|attestation|event|period|route|evidence'
REF = re.compile(rf'^(?:(cnd):)?({FAMILIES}):([a-z0-9][a-z0-9-]*)$')
STAGE = {'concept': 'Concept', 'corpus': 'Corpus', 'research': 'Research', 'outline': 'Outline', 'draft': 'Draft',
         'build': 'Build', 'design_qa': 'Design QA', 'publish': 'Publish', 'cross_link': 'Cross-link'}


def tid(authority, family, local):
    return f'tc:{authority}:{family}:{local}'


def walk(v):
    if isinstance(v, str):
        m = REF.match(v)
        return tid(m.group(1) or 'tc', 'bibliography_entry' if m.group(2) == 'bibliography' else m.group(2), m.group(3)) if m else v
    if isinstance(v, list):
        return [walk(x) for x in v]
    if isinstance(v, dict):
        return {k: walk(x) for k, x in v.items()}
    return v


if dst.exists():
    shutil.rmtree(dst)
for f in sorted(src.rglob('*.yaml')):
    if f.name == 'README.md':
        continue
    rec = yaml.safe_load(f.read_text())
    if not isinstance(rec, dict) or 'family' not in rec:
        continue
    authority = rec.pop('authority', 'tc')
    if authority != 'tc':
        print('skipped (external authority record, ADR 0006 item 17):', f.name)
        continue
    if rec['family'] == 'bibliography':
        rec['family'] = 'bibliography_entry'
    if 'cartographers' in rec:
        rec['makers'] = rec.pop('cartographers')
    rec = walk(rec)
    local = rec['id']
    rec['id'] = tid(authority, rec['family'], local)
    rec['origin'] = 'legacy'
    if rec['family'] == 'essay' and rec.get('stage') in ('Cross-link', 'Publish', 'cross_link', 'publish'):
        rec['lifecycle'] = 'published'
    elif rec['family'] == 'essay':
        rec['lifecycle'] = 'verified'
    rec.setdefault('slug', local)
    rec.setdefault('lifecycle', 'published' if False else 'researching')
    if rec.get('stage') in STAGE:
        rec['stage'] = STAGE[rec['stage']]
    rec.setdefault('release', 'held')
    out = dst / 'content' / rec['family'] / f.name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(yaml.safe_dump(rec, sort_keys=False, allow_unicode=True))
print('translated into', dst)
