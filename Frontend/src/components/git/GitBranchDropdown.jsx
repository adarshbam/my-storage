import { useState, useRef, useEffect } from 'react';
import { GitBranch, ChevronDown, Check, Plus, Search } from 'lucide-react';

export default function GitBranchDropdown({
  branches = [],
  selectedBranch = 'main',
  onSelectBranch,
  onOpenNewBranchModal,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredBranches = branches.filter((b) => {
    const name = typeof b === 'string' ? b : b.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelect = (branchName) => {
    if (onSelectBranch) {
      onSelectBranch(branchName);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const currentBranchName =
    typeof selectedBranch === 'string'
      ? selectedBranch
      : selectedBranch?.name || 'main';

  return (
    <div className={'relative inline-block text-left ' + className} ref={dropdownRef}>
      <button
        type='button'
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-xs font-mono font-bold shadow-sm ' +
          (isOpen
            ? 'bg-accent-soft border-accent-primary text-accent-primary ring-2 ring-accent-glow'
            : 'bg-white/80 dark:bg-black/50 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white') +
          (disabled ? ' opacity-50 cursor-not-allowed' : '')
        }
        title={'Current branch: ' + currentBranchName}
      >
        <GitBranch size={14} className='text-accent-primary shrink-0' />
        <span className='truncate max-w-[140px] tracking-tight'>{currentBranchName}</span>
        <ChevronDown
          size={13}
          className={
            'text-slate-400 dark:text-white/60 transition-transform duration-200 shrink-0 ' +
            (isOpen ? 'rotate-180 text-accent-primary' : '')
          }
        />
      </button>

      {isOpen && (
        <div className='absolute left-0 mt-2 w-64 origin-top-left rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/15 shadow-2xl shadow-black/50 backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
          <div className='p-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-black/30'>
            <div className='flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 mb-2'>
              <span className='uppercase tracking-wider'>Switch Branch</span>
              <span className='font-mono text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300'>
                {branches.length}
              </span>
            </div>
            <div className='relative'>
              <Search
                size={13}
                className='absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 pointer-events-none'
              />
              <input
                ref={searchInputRef}
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Filter branches...'
                className='w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-accent-primary placeholder:text-slate-400 dark:placeholder:text-white/30'
              />
            </div>
          </div>

          <div className='max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar'>
            {filteredBranches.length === 0 ? (
              <div className='py-4 text-center text-xs text-slate-400 dark:text-white/40 italic'>
                No branches found
              </div>
            ) : (
              filteredBranches.map((branch) => {
                const bName = typeof branch === 'string' ? branch : branch.name;
                const isSelected = bName === currentBranchName;
                return (
                  <button
                    key={bName}
                    type='button'
                    onClick={() => handleSelect(bName)}
                    className={
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all text-left group cursor-pointer ' +
                      (isSelected
                        ? 'bg-accent-soft text-accent-primary font-bold border border-accent-border shadow-sm'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white')
                    }
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <GitBranch
                        size={13}
                        className={
                          'shrink-0 ' +
                          (isSelected
                            ? 'text-accent-primary'
                            : 'text-slate-400 group-hover:text-slate-600 dark:text-white/40 dark:group-hover:text-white/80')
                        }
                      />
                      <span className='truncate'>{bName}</span>
                    </div>

                    {isSelected ? (
                      <Check size={14} className='text-accent-primary shrink-0 ml-2' />
                    ) : bName === 'main' || bName === 'master' ? (
                      <span className='text-[9px] font-sans uppercase font-bold text-slate-400 dark:text-white/40 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded'>
                        default
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {onOpenNewBranchModal && (
            <div className='p-1.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-black/30'>
              <button
                type='button'
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewBranchModal();
                }}
                className='w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-accent-primary hover:bg-accent-soft border border-dashed border-accent-border transition-all cursor-pointer'
              >
                <Plus size={13} />
                <span>Create New Branch</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}