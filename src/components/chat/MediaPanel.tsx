import { Upload } from "lucide-react";
import { RefObject, SVGProps } from "react";

const Youtube = ({ size = 24, className = "", ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

interface TranscriptLine {
  time: number;
  text: string;
  isKeyPoint: boolean;
}

interface Message {
  transcript?: TranscriptLine[];
  [key: string]: unknown;
}

interface MediaPanelProps {
  currentVideoId: string | null;
  currentVideoStartTime: number | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  messages: Message[];
  handleSeekTo: (time: number) => void;
  formatTimestamp: (time: number) => string;
}

export default function MediaPanel({
  currentVideoId,
  currentVideoStartTime,
  fileInputRef,
  handleFileUpload,
  messages,
  handleSeekTo,
  formatTimestamp
}: MediaPanelProps) {
  return (
    <aside className="hidden lg:flex w-96 border-l border-gray-100 flex-col bg-gray-50/50 overflow-y-auto shrink-0 h-full">
      <div className="p-6">
        <div className="space-y-8">
          <div className="aspect-video w-full rounded-xl bg-white border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/50 group relative">
            {currentVideoId ? (
              <iframe
                key={`${currentVideoId}-${currentVideoStartTime}`}
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${currentVideoId}?start=${currentVideoStartTime}&autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 p-6 text-center">
                <Youtube
                  size={48}
                  strokeWidth={1.5}
                  className="mb-4 opacity-20"
                />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Nessuna anteprima
                  <br />
                  carica un link video
                </p>
              </div>
            )}
          </div>

          {!currentVideoId && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all group active:scale-98 shadow-sm text-center"
            >
              <div className="p-4 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-all inline-flex items-center justify-center">
                <Upload size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 mb-1">
                  Carica Documenti
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  PDF o file TXT
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
              />
            </button>
          )}

          {currentVideoId && messages.some((m) => m.transcript) && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-lg">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">
                  Trascrizione
                </p>
              </div>
              <div className="p-4 space-y-2 max-h-100 overflow-y-auto">
                {messages
                  .find((m) => m.transcript)
                  ?.transcript?.map((line, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <button
                        onClick={() => handleSeekTo(line.time)}
                        className="shrink-0 text-purple-600 hover:text-purple-700 font-mono font-bold"
                      >
                        {formatTimestamp(line.time)}
                      </button>
                      <span
                        className={
                          line.isKeyPoint
                            ? "font-bold text-gray-900"
                            : "text-gray-600"
                        }
                      >
                        {line.text}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
