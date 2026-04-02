import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: any };

/**
 * Global UI crash catcher.
 * Prevents a "blank screen" by showing a readable error panel.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      const message =
        typeof this.state.error?.message === 'string'
          ? this.state.error.message
          : String(this.state.error);

      return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-6 max-w-2xl w-full border border-red-500/20">
            <div className="text-xl font-black text-white">حدث خطأ في الواجهة</div>
            <div className="text-sm text-slate-300 mt-2">
              إذا ظهرت عندك صفحة فاضية سابقًا، هذا الخطأ هو السبب.
              <span className="block mt-1 text-slate-400">صوّر هذه الرسالة وارسلها لي لنصلحها فورًا.</span>
            </div>
            <pre className="mt-4 whitespace-pre-wrap text-xs text-red-200 bg-red-950/30 border border-red-800/40 rounded-xl p-3 overflow-auto max-h-[240px]">
              {message}
            </pre>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-xl bg-slate-800/60 text-slate-200 hover:bg-slate-800 transition"
                onClick={() => window.location.reload()}
              >
                إعادة تحميل
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
