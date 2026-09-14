'use client';

// ============================================================================
// PROMPT LAUNCHER — shows a ready-made prompt with copy + "open in LLM" buttons.
// Used instead of building a custom tool: people run the prompt in a public LLM.
// ============================================================================

import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PromptLauncherProps {
  title: string;
  description: string;
  prompt: string;
}

// Each app is opened with the prompt in the `q` URL parameter, which pre-fills
// the chat box. Grok and ChatGPT support it; Claude and Gemini may ignore it,
// so the prompt is also copied to the clipboard as a paste fallback.
const LLM_APPS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Claude', url: 'https://claude.ai/new' },
  { name: 'Gemini', url: 'https://gemini.google.com/app' },
  { name: 'Grok', url: 'https://grok.com/' },
] as const;

export default function PromptLauncher({ title, description, prompt }: PromptLauncherProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied');
    } catch {
      toast.error('Could not copy — select the text and copy manually');
    }
  };

  const openApp = (app: (typeof LLM_APPS)[number]) => {
    // Start the copy before opening: the new tab takes focus, and clipboard
    // writes need this page to be focused. Opening synchronously also keeps
    // the click's user gesture, so popup blockers allow the new tab.
    const copied = navigator.clipboard?.writeText(prompt);
    window.open(`${app.url}?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
    copied
      ?.then(() => toast.success(`Opening ${app.name} — if the prompt isn't filled in, press Ctrl+V`))
      .catch(() => toast.message(`Opening ${app.name}`));
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>

      <div className="rounded-xl border border-gray-700/60 bg-gray-900/60">
        <div className="flex items-center justify-between border-b border-gray-700/60 px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Prompt</span>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 text-gray-300 hover:text-white">
            <Copy className="mr-1.5 h-4 w-4" />
            Copy
          </Button>
        </div>
        <pre
          className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words px-4 py-4 text-left text-sm leading-relaxed text-gray-200"
          suppressHydrationWarning
        >
          {prompt}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LLM_APPS.map((app) => (
          <Button key={app.name} onClick={() => openApp(app)} variant="secondary">
            Open in {app.name}
            <ExternalLink className="ml-1.5 h-4 w-4" />
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Each button opens the app with the prompt filled in. The prompt is also copied, so if an app opens empty, just paste (Ctrl+V).
      </p>
    </div>
  );
}
