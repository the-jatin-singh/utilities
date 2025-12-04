'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  Copy, 
  Code2, 
  Image as ImageIcon, 
  RefreshCw, 
  Check, 
  Maximize, 
  Palette, 
  Move,
  Settings2,
  FileCode,
  FileType,
  Ban,
  Plus,
  Minus
} from 'lucide-react';

export default function SvgCustomizerPage() {
  // Input State
  const [inputSvg, setInputSvg] = useState('');
  
  // Customization State
  const [config, setConfig] = useState({
    width: '24',
    height: '24',
    fill: '#000000',
    stroke: 'none',
    strokeWidth: '0',
    opacity: 100,
    rotate: 0,
    flipX: false,
    flipY: false,
    autoColor: false,
    currentColor: false,
  });

  // UI State
  const [previewBg, setPreviewBg] = useState('grid');
  const [copied, setCopied] = useState<string | null>(null);

  // Default placeholder
  useEffect(() => {
    setInputSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" />
  <path d="M12 16v-4" />
  <path d="M12 8h.01" />
</svg>`);
  }, []);

  // --- THE ENGINE ---
  const processedSvg = useMemo(() => {
    // 1. SSR & Empty Check
    if (typeof window === 'undefined') return ''; // Prevent server-side crash
    if (!inputSvg.trim()) return '';

    try {
      // 2. Sanitize/Prepare Input
      let svgContent = inputSvg;
      if (!svgContent.includes('<svg')) {
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${svgContent}</svg>`;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      // Check if parsing failed or didn't yield an SVG
      if (!svgElement || svgElement.tagName !== 'svg') return inputSvg;

      // 3. Apply Dimensions (Attribute + Style to ensure override)
      svgElement.setAttribute('width', config.width);
      svgElement.setAttribute('height', config.height);
      svgElement.style.width = `${config.width}px`;
      svgElement.style.height = `${config.height}px`;
      
      // 4. Apply Transformations
      const transforms = [];
      if (config.rotate) transforms.push(`rotate(${config.rotate}deg)`);
      if (config.flipX) transforms.push('scaleX(-1)');
      if (config.flipY) transforms.push('scaleY(-1)');
      
      if (transforms.length > 0) {
        svgElement.style.transform = transforms.join(' ');
        svgElement.style.transformOrigin = 'center';
        svgElement.style.transformBox = 'fill-box';
      }

      // 5. Apply Global Attributes
      if (config.strokeWidth !== '0') {
         svgElement.setAttribute('stroke-width', config.strokeWidth);
         svgElement.style.strokeWidth = config.strokeWidth;
      }
      
      // Opacity Fix
      if (config.opacity === 100) {
        svgElement.removeAttribute('opacity');
        svgElement.style.opacity = '';
      } else {
        svgElement.setAttribute('opacity', (config.opacity / 100).toString());
        svgElement.style.opacity = (config.opacity / 100).toString();
      }

      // 6. Apply Colors
      const targetFill = config.currentColor ? 'currentColor' : config.fill;
      const targetStroke = config.currentColor ? 'currentColor' : config.stroke;

      // Helper to check if a value effectively means "has color"
      const hasColor = (val: string | null): boolean => {
        return val !== null && val !== 'none' && val !== 'transparent';
      };

      // Strategy A: Apply to ROOT (Always happens)
      svgElement.setAttribute('fill', targetFill);
      svgElement.style.fill = targetFill;
      
      svgElement.setAttribute('stroke', targetStroke);
      svgElement.style.stroke = targetStroke;

      // Strategy B: Force Override (Only if autoColor is ON)
      if (config.autoColor) {
        const elements = svgElement.querySelectorAll('*');
        elements.forEach(el => {
          // Handle Fill
          const elFill = el.getAttribute('fill');
          const elStyleFill = (el as HTMLElement).style?.fill; 
          
          if (hasColor(elFill) || hasColor(elStyleFill)) {
             el.setAttribute('fill', targetFill);
             if ((el as HTMLElement).style) (el as HTMLElement).style.fill = targetFill;
          }

          // Handle Stroke
          const elStroke = el.getAttribute('stroke');
          const elStyleStroke = (el as HTMLElement).style?.stroke;

          if (hasColor(elStroke) || hasColor(elStyleStroke)) {
             el.setAttribute('stroke', targetStroke);
             if ((el as HTMLElement).style) (el as HTMLElement).style.stroke = targetStroke;
          }
        });
      }

      // Serialize only the SVG element
      return new XMLSerializer().serializeToString(svgElement);

    } catch (e) {
      console.error("SVG Parsing Error", e);
      return inputSvg;
    }
  }, [inputSvg, config]);

  // Generate React Component String
  const reactComponentString = useMemo(() => {
    let code = processedSvg;
    
    code = code
      .replace(/class=/g, 'className=')
      .replace(/fill-rule/g, 'fillRule')
      .replace(/clip-rule/g, 'clipRule')
      .replace(/stroke-width/g, 'strokeWidth')
      .replace(/stroke-linecap/g, 'strokeLinecap')
      .replace(/stroke-linejoin/g, 'strokeLinejoin')
      .replace(/stroke-miterlimit/g, 'strokeMiterlimit')
      .replace(/stop-color/g, 'stopColor')
      .replace(/stop-opacity/g, 'stopOpacity')
      .replace(/style="([^"]*)"/g, (match, p1) => {
        const styleObj = p1.split(';').reduce((acc: string[], style: string) => {
          const [key, value] = style.split(':');
          if (key && value) {
            const camelKey = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            acc.push(`${camelKey}: "${value.trim()}"`);
          }
          return acc;
        }, []).join(', ');
        return `style={{ ${styleObj} }}`;
      });
    
    return `const CustomIcon = (props) => (\n  ${code}\n);`;
  }, [processedSvg]);


  // --- HANDLERS ---

  const handleCopySvg = () => {
    navigator.clipboard.writeText(processedSvg);
    setCopied('svg');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyJsx = () => {
    navigator.clipboard.writeText(reactComponentString);
    setCopied('jsx');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-icon.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setConfig({
      width: '24',
      height: '24',
      fill: '#000000',
      stroke: 'none',
      strokeWidth: '0',
      opacity: 100,
      rotate: 0,
      flipX: false,
      flipY: false,
      autoColor: false,
      currentColor: false,
    });
  };

  const NumberControl = ({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) => (
    <div className="space-y-1">
      <span className="text-[10px] text-zinc-400 uppercase">{label}</span>
      <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden group focus-within:ring-1 focus-within:ring-indigo-500">
        <button 
          onClick={() => {
            const current = parseInt(value) || 0;
            if (current > 0) onChange((current - 1).toString());
          }}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <Minus size={12} />
        </button>
        <input 
          type="number" 
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^\d+$/.test(val)) {
              onChange(val || '0');
            }
          }}
          className="w-full bg-transparent text-center text-sm font-mono outline-none appearance-none"
        />
        <button 
          onClick={() => {
            const current = parseInt(value) || 0;
            onChange((current + 1).toString());
          }}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0c0c0e] font-sans text-zinc-900 dark:text-zinc-100 pb-32 md:pb-40 transition-colors selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      
      <style jsx global>{`
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { 
          background: rgba(161, 161, 170, 0.3); 
          border-radius: 99px; 
          border: 3px solid transparent; 
          background-clip: content-box; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: rgba(161, 161, 170, 0.5); 
          border: 3px solid transparent; 
          background-clip: content-box; 
        }
        textarea { scrollbar-gutter: stable; }
        /* Hide native number input spinners */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
        
        {/* Main Grid Layout - Reordered for Mobile */}
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6 h-full">
          
          {/* MIDDLE COLUMN: Preview (Now Top on Mobile) */}
          <div className="order-1 xl:order-2 xl:col-span-6 flex flex-col gap-4">
             <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase flex items-center gap-2">
                <ImageIcon size={14} />
                Live Preview
              </label>
              
              <div className="flex bg-white dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setPreviewBg('grid')}
                  className={`p-1.5 rounded-md transition-all ${previewBg === 'grid' ? 'bg-zinc-100 dark:bg-zinc-800 text-indigo-500' : 'text-zinc-400'}`}
                  title="Grid Background"
                >
                  <div className="w-3 h-3 opacity-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                </button>
                <button 
                  onClick={() => setPreviewBg('light')}
                  className={`p-1.5 rounded-md transition-all ${previewBg === 'light' ? 'bg-zinc-100 dark:bg-zinc-800 text-indigo-500' : 'text-zinc-400'}`}
                  title="Light Background"
                >
                  <div className="w-3 h-3 bg-white border border-zinc-200 rounded-full"></div>
                </button>
                <button 
                  onClick={() => setPreviewBg('dark')}
                  className={`p-1.5 rounded-md transition-all ${previewBg === 'dark' ? 'bg-zinc-100 dark:bg-zinc-800 text-indigo-500' : 'text-zinc-400'}`}
                  title="Dark Background"
                >
                  <div className="w-3 h-3 bg-zinc-900 border border-zinc-700 rounded-full"></div>
                </button>
              </div>
            </div>

            {/* Preview Area */}
            <div className={`
              flex-1 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-auto grid place-items-center relative min-h-[300px] md:min-h-[500px] transition-colors
              ${previewBg === 'light' ? 'bg-white' : ''}
              ${previewBg === 'dark' ? 'bg-[#18181b]' : ''}
              ${previewBg === 'grid' ? 'bg-zinc-50 dark:bg-[#121214] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]' : ''}
            `}>
              {processedSvg ? (
                <div 
                  className="w-full h-full flex items-center justify-center p-8"
                  dangerouslySetInnerHTML={{ __html: processedSvg }}
                />
              ) : (
                <span className="text-zinc-400 text-sm font-medium">No SVG Detected</span>
              )}
            </div>
             <div className="flex justify-end px-2">
                <div className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 inline-block">
                  Rendered Size: {config.width}px × {config.height}px
                </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Controls (Now Middle on Mobile) */}
          <div className="order-2 xl:order-3 xl:col-span-3 flex flex-col gap-4">
             <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase flex items-center gap-2">
                <Settings2 size={14} />
                Properties
              </label>
              <button 
                onClick={handleReset}
                className="text-xs text-zinc-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={10} /> Reset
              </button>
            </div>

            <div className="flex-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-6 overflow-y-auto custom-scrollbar shadow-sm xl:shadow-none">
              
              {/* Dimensions */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Maximize size={12} /> Dimensions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <NumberControl 
                    label="Width" 
                    value={config.width} 
                    onChange={(val) => setConfig({...config, width: val})} 
                  />
                  <NumberControl 
                    label="Height" 
                    value={config.height} 
                    onChange={(val) => setConfig({...config, height: val})} 
                  />
                </div>
              </div>

              <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800"></div>

              {/* Colors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Palette size={12} /> Colors
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-zinc-500 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={config.autoColor}
                      onChange={(e) => setConfig({...config, autoColor: e.target.checked})}
                      className="rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500 accent-indigo-500"
                    />
                    Force Override
                  </label>
                </div>
                
                <div className="space-y-3">
                   {/* Current Color Toggle */}
                   <label className="flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors select-none">
                      <input 
                        type="checkbox" 
                        checked={config.currentColor}
                        onChange={(e) => setConfig({...config, currentColor: e.target.checked})}
                        className="rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500 accent-indigo-500"
                      />
                      <span className="text-xs font-medium">Use "CurrentColor"</span>
                   </label>

                   {!config.currentColor && (
                     <>
                        {/* FILL Control */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Fill</span>
                          <div className="flex items-center gap-2">
                             <button
                               onClick={() => setConfig({...config, fill: 'none'})}
                               className={`p-1 rounded-md border transition-colors ${config.fill === 'none' ? 'bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-transparent border-transparent text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                               title="No Fill (Transparent)"
                             >
                                <Ban size={14} />
                             </button>
                             {config.fill !== 'none' && (
                               <span className="text-[10px] font-mono text-zinc-400 w-14 text-right">{config.fill}</span>
                             )}
                             <input 
                                type="color" 
                                value={config.fill === 'none' ? '#000000' : config.fill}
                                onChange={(e) => setConfig({...config, fill: e.target.value})}
                                className={`w-8 h-8 md:w-6 md:h-6 rounded-full overflow-hidden cursor-pointer border-none p-0 bg-transparent ${config.fill === 'none' ? 'opacity-30 grayscale' : ''}`}
                              />
                          </div>
                        </div>

                        {/* STROKE Control */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">Stroke</span>
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => setConfig({...config, stroke: 'none'})}
                               className={`p-1 rounded-md border transition-colors ${config.stroke === 'none' ? 'bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-transparent border-transparent text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                               title="No Stroke (Transparent)"
                             >
                                <Ban size={14} />
                             </button>
                             {config.stroke !== 'none' && (
                                <span className="text-[10px] font-mono text-zinc-400 w-14 text-right">{config.stroke}</span>
                             )}
                             <input 
                                type="color" 
                                value={config.stroke === 'none' ? '#000000' : config.stroke}
                                onChange={(e) => setConfig({...config, stroke: e.target.value})}
                                className={`w-8 h-8 md:w-6 md:h-6 rounded-full overflow-hidden cursor-pointer border-none p-0 bg-transparent ${config.stroke === 'none' ? 'opacity-30 grayscale' : ''}`}
                              />
                          </div>
                        </div>
                     </>
                   )}
                </div>
              </div>

               <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800"></div>

              {/* Transforms */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Move size={12} /> Transform
                </label>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Rotation</span>
                        <span>{config.rotate}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="360" 
                        value={config.rotate}
                        onChange={(e) => setConfig({...config, rotate: parseInt(e.target.value)})}
                        className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setConfig({...config, flipX: !config.flipX})}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${config.flipX ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
                    >
                      Flip X
                    </button>
                      <button 
                      onClick={() => setConfig({...config, flipY: !config.flipY})}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${config.flipY ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
                    >
                      Flip Y
                    </button>
                  </div>
                </div>
              </div>

               <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800"></div>
               
               {/* Extras */}
               <div className="space-y-3">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Opacity</span>
                      <span>{config.opacity}%</span>
                   </div>
                   <input 
                      type="range" 
                      min="0" max="100" 
                      value={config.opacity}
                      onChange={(e) => setConfig({...config, opacity: parseInt(e.target.value)})}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                   />
               </div>

            </div>
          </div>

          {/* LEFT COLUMN: Input Area (Now Bottom on Mobile) */}
          <div className="order-3 xl:order-1 xl:col-span-3 flex flex-col gap-4 min-h-[300px] md:min-h-[500px]">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase flex items-center gap-2">
                <Code2 size={14} />
                Input SVG
              </label>
              <button onClick={() => setInputSvg('')} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                Clear
              </button>
            </div>
            <textarea
              value={inputSvg}
              onChange={(e) => setInputSvg(e.target.value)}
              placeholder="Paste your <svg> code here..."
              className="flex-1 w-full p-4 font-mono text-xs bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-1 focus:ring-indigo-500/30 outline-none resize-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all shadow-sm"
              spellCheck={false}
            />
          </div>

        </div>
      </div>

      {/* Floating Action Bar - Mobile Optimized */}
      <div className="fixed bottom-6 md:bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto flex items-center gap-1 p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl shadow-2xl rounded-full border border-zinc-200/50 dark:border-zinc-700/50 ring-1 ring-black/5 dark:ring-white/5 transition-transform hover:scale-[1.01] overflow-x-auto max-w-full">
          
          <button
            onClick={handleCopySvg}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-full transition-colors group justify-center whitespace-nowrap"
          >
             {copied === 'svg' ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 hidden md:inline">Copied</span>
                </>
             ) : (
                <>
                  <FileType size={14} className="text-zinc-400 group-hover:text-orange-500 transition-colors" />
                  <span className="hidden md:inline">Copy SVG</span>
                  <span className="md:hidden">SVG</span>
                </>
             )}
          </button>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

           <button
            onClick={handleCopyJsx}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-full transition-colors group justify-center whitespace-nowrap"
          >
             {copied === 'jsx' ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 hidden md:inline">Copied</span>
                </>
             ) : (
                <>
                  <FileCode size={14} className="text-zinc-400 group-hover:text-cyan-500 transition-colors" />
                  <span className="hidden md:inline">Copy React</span>
                  <span className="md:hidden">JSX</span>
                </>
             )}
          </button>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

          <button
            onClick={handleDownload}
            className="p-2.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-all"
            title="Download .svg file"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

    </div>
  );
}