"""Package the built extension and project source for the separate static website."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
site = root / 'website/geoplonk/dist'
downloads = site / 'downloads'
downloads.mkdir(parents=True, exist_ok=True)
manifest = json.loads((root / 'dist/manifest.json').read_text())
assert manifest['version'] == version, 'Build the extension before packaging its download.'

def archive(name, entries):
    output = downloads / name
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
        for path, relative in entries:
            target.write(path, relative)
    return {'file': name, 'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}

extension = archive(f'geoplonk-chrome-v{version}.zip', [(p, str(Path('geoplonk') / p.relative_to(root / 'dist'))) for p in sorted((root / 'dist').rglob('*')) if p.is_file() and not p.name.startswith('.')])
source_paths = []
for name in ['src', 'public', 'tests', 'scripts']:
    source_paths += [p for p in (root / name).rglob('*') if p.is_file() and '__pycache__' not in p.parts and not p.name.startswith('.')]
source_paths += [root / name for name in ['README.md', 'LICENSE', 'package.json', 'package-lock.json', 'tsconfig.json', 'game.html', 'popup.html', 'layout-preview.html']]
source_paths += list(root.glob('vite*.ts'))
# Include the static page sources required by the launcher contract tests,
# without hosting credentials, nested Git data or generated download archives.
source_paths += [p for p in site.iterdir() if p.is_file() and p.suffix in {'.html', '.css', '.js', '.svg'}]
source_paths += [root / 'website/README.md']
source_paths += [p for p in (root / 'docs').glob('*.md') if p.is_file()]
source = archive(f'geoplonk-source-v{version}.zip', [(p, str(Path('geoplonk-source') / p.relative_to(root))) for p in sorted(source_paths)])
(site / 'release.json').write_text(json.dumps({'version': version, 'extension': extension, 'source': source}, indent=2) + '\n')
with zipfile.ZipFile(downloads / extension['file']) as packaged:
    assert 'geoplonk/manifest.json' in packaged.namelist()
    assert all(packaged.testzip() is None for _ in [0])
print(json.dumps({'version': version, 'extension': extension, 'source': source}, indent=2))
