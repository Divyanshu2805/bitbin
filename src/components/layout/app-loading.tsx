import { BinningLoader } from '@/components/shared/binning-loader';

// The app shell ((app)/layout.tsx) stays on screen while a page loads, sidebar
// and all, so this fills only the content area: bits being binned, in the middle.
// `data-route-loading` lets page slides wait until it's gone.
export default function AppLoading() {
  return (
    <div data-route-loading className="grid min-h-[60vh] place-items-center">
      <BinningLoader />
    </div>
  );
}
