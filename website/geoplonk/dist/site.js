const download = document.querySelector('#download-extension');
const status = document.querySelector('#download-status');
download.addEventListener('click', () => {
  document.querySelector('#install-guide').open = true;
  status.textContent = 'Your download is starting. Unzip it, then follow the three steps below.';
});
document.querySelector('#copy-address').addEventListener('click', async event => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText('chrome://extensions');
    button.textContent = 'Address copied ✓';
    status.textContent = 'Paste chrome://extensions into Chrome’s address bar.';
  } catch {
    status.textContent = 'Type chrome://extensions into Chrome’s address bar.';
  }
});
fetch('release.json').then(response => response.json()).then(release => {
  document.querySelector('#download-size').textContent = `${(release.extension.bytes / 1024).toFixed(0)} KB ZIP`;
}).catch(() => {});
