const video = document.getElementById('intro-video');
const skipButton = document.getElementById('skip-loader');
let completed = false;

function completeLoader() {
  if (completed) return;
  completed = true;
  window.electronAPI?.loaderComplete();
}

video.addEventListener('ended', completeLoader);
video.addEventListener('error', completeLoader);
skipButton.addEventListener('click', completeLoader);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') completeLoader();
  if (event.key === 'Escape') window.electronAPI?.windowControl('close');
});

video.play().catch(() => {
  // Continue safely if a platform-specific media policy blocks autoplay.
  setTimeout(completeLoader, 1200);
});
