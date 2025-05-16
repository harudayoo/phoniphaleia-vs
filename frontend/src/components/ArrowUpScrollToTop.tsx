import { ArrowUp } from 'lucide-react';

interface ArrowUpScrollToTopProps {
  show: boolean;
}

const ArrowUpScrollToTop: React.FC<ArrowUpScrollToTopProps> = ({ show }) => {
  if (!show) return null;

  // Custom ease-in-out scroll to top
  const handleScrollToTop = () => {
    const duration = 700;
    const start = window.scrollY;
    const startTime = performance.now();

    function easeInOut(t: number) {
      return t < 0.5
        ? 2 * t * t
        : -1 + (4 - 2 * t) * t;
    }

    function animateScroll(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOut(progress);
      window.scrollTo(0, start * (1 - ease));
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    }

    requestAnimationFrame(animateScroll);
  };

  return (
    <button
      type="button"
      className="fixed bottom-8 right-8 z-50 p-3 bg-white/90 border border-gray-300 rounded-full shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:bg-blue-50"
      onClick={handleScrollToTop}
      aria-label="Scroll to top"
    >
      <ArrowUp size={22} className="text-blue-700" />
    </button>
  );
};

export default ArrowUpScrollToTop;